import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { UserId } from '../../domain/value-objects/user-id.value-object';
import { GeoPoint } from '../../domain/value-objects/geo-point.value-object';
import { LocationTimestamp } from '../../domain/value-objects/location-timestamp.value-object';
import { UserAreaState } from '../../domain/entities/user-area-state.entity';
import { UserEnteredAreaEvent } from '../../domain/events/user-entered-area.event';
import { UserExitedAreaEvent } from '../../domain/events/user-exited-area.event';

import {
    GEOFENCE_READ_REPOSITORY,
    IGeofenceReadRepository,
} from '../ports/geofence-read.repository.port';
import {
    USER_AREA_STATE_REPOSITORY,
    IUserAreaStateRepository,
} from '../ports/user-area-state.repository.port';
import {
    OUTBOX_EVENT_REPOSITORY,
    IOutboxEventRepository,
    OutboxEventInput,
} from '../ports/outbox-event.repository.port';
import {
    LOCATION_TRANSACTION_MANAGER,
    ILocationTransactionManager,
} from '../ports/location-transaction.manager.port';

export interface ProcessLocationCommand {
    userId: string;
    lat: number;
    lon: number;
    timestamp: string;
}

export interface ProcessLocationResult {
    userId: string;
    enteredAreaIds: string[];
    exitedAreaIds: string[];
    timestamp: string;
}

/**
 * ProcessLocationUseCase
 *
 * Orchestrates the full location processing pipeline with the Transactional Outbox Pattern.
 *
 * Flow:
 *   1. Build and validate domain value objects
 *   2. Spatial query — find containing areas via PostGIS (OUTSIDE transaction — intentional tradeoff)
 *   3. Advisory-locked transaction:
 *      a. Load previous inside-state
 *      b. Staleness check — reject if MAX(updated_at) > incoming timestamp
 *      c. Compute transitions via pure domain logic
 *      d. Persist user_area_state mutation
 *      e. Insert outbox_events rows for each transition event (same tx — atomic)
 *      f. COMMIT (state mutation + outbox intent are atomically durable)
 *   4. Return result
 *
 * Kafka publish has been REMOVED from the request path.
 * Kafka events are published asynchronously by the OutboxPollerService.
 *
 * This guarantees that if the DB transaction commits, the event intent is never lost —
 * even if the process crashes immediately after step 3f.
 *
 * The spatial query runs OUTSIDE the advisory-locked transaction (intentional tradeoff):
 *   - Geofence mutations are rare administrative operations
 *   - Holding the lock during spatial index scans degrades throughput
 *   - The transactional state reconciliation ensures correctness regardless
 *
 * No raw SQL. No Prisma. No Kafka. No HTTP concerns.
 */
@Injectable()
export class ProcessLocationUseCase {
    constructor(
        @Inject(GEOFENCE_READ_REPOSITORY)
        private readonly geofenceReadRepo: IGeofenceReadRepository,
        @Inject(USER_AREA_STATE_REPOSITORY)
        private readonly userAreaStateRepo: IUserAreaStateRepository,
        @Inject(OUTBOX_EVENT_REPOSITORY)
        private readonly outboxRepo: IOutboxEventRepository,
        @Inject(LOCATION_TRANSACTION_MANAGER)
        private readonly transactionManager: ILocationTransactionManager,
    ) { }

    async execute(command: ProcessLocationCommand): Promise<ProcessLocationResult> {
        // 1. Build domain value objects — validates input
        const userId = UserId.create(command.userId);
        const point = GeoPoint.create(command.lat, command.lon);
        const timestamp = LocationTimestamp.create(command.timestamp);

        // 2. Spatial query — OUTSIDE transaction (intentional tradeoff documented in plan)
        const currentInsideAreaIds = await this.geofenceReadRepo.findContainingAreaIds(
            point.lon,
            point.lat,
        );
        const currentInsideSet = new Set(currentInsideAreaIds);

        // 3. Advisory-locked transactional block
        const { enteredAreaIds, exitedAreaIds } =
            await this.transactionManager.executeInTransaction(
                userId.value,
                async (tx) => {
                    // 3a. Load previous inside-state
                    const previousRecords = await this.userAreaStateRepo.loadInsideAreas(
                        userId.value,
                        tx,
                    );

                    // 3b. Staleness check — MAX(updated_at) semantics
                    if (previousRecords.length > 0) {
                        const maxUpdatedAt = previousRecords.reduce(
                            (max, record) =>
                                record.updatedAt > max ? record.updatedAt : max,
                            previousRecords[0].updatedAt,
                        );

                        if (maxUpdatedAt > timestamp.value) {
                            return { enteredAreaIds: [], exitedAreaIds: [] };
                        }
                    }

                    // 3c. Compute transitions — pure domain logic
                    const previousInsideSet = new Set(
                        previousRecords.map((r) => r.areaId),
                    );
                    const transitions = UserAreaState.computeTransitions(
                        previousInsideSet,
                        currentInsideSet,
                    );

                    const hasTransitions =
                        transitions.enteredAreaIds.length > 0 ||
                        transitions.exitedAreaIds.length > 0;

                    if (hasTransitions) {
                        // 3d. Persist state changes
                        await this.userAreaStateRepo.applyStateChanges(
                            userId.value,
                            transitions.enteredAreaIds,
                            transitions.exitedAreaIds,
                            timestamp.value,
                            tx,
                        );

                        // 3e. Build domain events and derive outbox inputs
                        const isoTimestamp = timestamp.value.toISOString();
                        const outboxInputs: OutboxEventInput[] = [];

                        for (const areaId of transitions.enteredAreaIds) {
                            const domainEvent = new UserEnteredAreaEvent({
                                eventId: uuidv4(),
                                userId: userId.value,
                                areaId,
                                timestamp: isoTimestamp,
                            });
                            outboxInputs.push({
                                eventId: domainEvent.eventId,
                                aggregateType: 'UserAreaState',
                                aggregateId: userId.value,
                                eventType: domainEvent.type,
                                partitionKey: userId.value,
                                payload: {
                                    eventId: domainEvent.eventId,
                                    type: domainEvent.type,
                                    userId: domainEvent.userId,
                                    areaId: domainEvent.areaId,
                                    timestamp: domainEvent.timestamp,
                                },
                            });
                        }

                        for (const areaId of transitions.exitedAreaIds) {
                            const domainEvent = new UserExitedAreaEvent({
                                eventId: uuidv4(),
                                userId: userId.value,
                                areaId,
                                timestamp: isoTimestamp,
                            });
                            outboxInputs.push({
                                eventId: domainEvent.eventId,
                                aggregateType: 'UserAreaState',
                                aggregateId: userId.value,
                                eventType: domainEvent.type,
                                partitionKey: userId.value,
                                payload: {
                                    eventId: domainEvent.eventId,
                                    type: domainEvent.type,
                                    userId: domainEvent.userId,
                                    areaId: domainEvent.areaId,
                                    timestamp: domainEvent.timestamp,
                                },
                            });
                        }

                        // 3f. Insert outbox rows in the SAME transaction as state mutation.
                        // If the transaction commits, both state and event intent are durable.
                        // If the transaction rolls back, neither persists.
                        await this.outboxRepo.insertBatch(outboxInputs, tx);
                    }

                    return transitions;
                },
            );

        // 4. Return result — Kafka publish happens asynchronously via OutboxPollerService
        return {
            userId: userId.value,
            enteredAreaIds,
            exitedAreaIds,
            timestamp: timestamp.value.toISOString(),
        };
    }
}
