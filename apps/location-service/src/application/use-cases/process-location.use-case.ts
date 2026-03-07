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
    AREA_TRANSITION_PUBLISHER,
    IAreaTransitionPublisher,
    AreaTransitionEvent,
} from '../ports/area-transition.publisher.port';
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
 * Orchestrates the full location processing pipeline:
 *
 *   1. Build domain value objects (validates input)
 *   2. Spatial query — find containing areas via PostGIS (outside transaction)
 *   3. Transactional state reconciliation (inside advisory-locked transaction):
 *      a. Load previous inside-state
 *      b. Staleness check — reject if MAX(updated_at) > incoming timestamp
 *      c. Compute transitions via pure domain logic
 *      d. Persist state changes
 *   4. Generate domain events (after DB commit)
 *   5. Publish events to Kafka (after DB commit)
 *   6. Return result
 *
 * The spatial query runs OUTSIDE the advisory-locked transaction.
 * This is an intentional performance/consistency tradeoff:
 *   - Geofence mutations are rare administrative operations
 *   - Holding the lock during spatial index scans would degrade throughput
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
        @Inject(AREA_TRANSITION_PUBLISHER)
        private readonly transitionPublisher: IAreaTransitionPublisher,
        @Inject(LOCATION_TRANSACTION_MANAGER)
        private readonly transactionManager: ILocationTransactionManager,
    ) { }

    async execute(command: ProcessLocationCommand): Promise<ProcessLocationResult> {
        // 1. Build domain value objects — validates input
        const userId = UserId.create(command.userId);
        const point = GeoPoint.create(command.lat, command.lon);
        const timestamp = LocationTimestamp.create(command.timestamp);

        // 2. Spatial query — OUTSIDE transaction (intentional tradeoff)
        //    Find which geofence areas contain this point via PostGIS ST_Covers.
        const currentInsideAreaIds = await this.geofenceReadRepo.findContainingAreaIds(
            point.lon,
            point.lat,
        );
        const currentInsideSet = new Set(currentInsideAreaIds);

        // 3. Transactional state reconciliation
        //    Advisory lock serializes concurrent requests for the same userId.
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
                    //     If the newest persisted timestamp is newer than the incoming event,
                    //     this request is stale: no mutations, no transitions, no events.
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

                    // 3d. Persist state changes
                    if (
                        transitions.enteredAreaIds.length > 0 ||
                        transitions.exitedAreaIds.length > 0
                    ) {
                        await this.userAreaStateRepo.applyStateChanges(
                            userId.value,
                            transitions.enteredAreaIds,
                            transitions.exitedAreaIds,
                            timestamp.value,
                            tx,
                        );
                    }

                    return transitions;
                },
            );

        // 4. Generate domain events — AFTER transaction committed
        const events: AreaTransitionEvent[] = [];
        const isoTimestamp = timestamp.value.toISOString();

        for (const areaId of enteredAreaIds) {
            events.push(
                new UserEnteredAreaEvent({
                    eventId: uuidv4(),
                    userId: userId.value,
                    areaId,
                    timestamp: isoTimestamp,
                }),
            );
        }

        for (const areaId of exitedAreaIds) {
            events.push(
                new UserExitedAreaEvent({
                    eventId: uuidv4(),
                    userId: userId.value,
                    areaId,
                    timestamp: isoTimestamp,
                }),
            );
        }

        // 5. Publish events — AFTER transaction committed
        if (events.length > 0) {
            await this.transitionPublisher.publishTransitions(events);
        }

        // 6. Return result
        return {
            userId: userId.value,
            enteredAreaIds,
            exitedAreaIds,
            timestamp: isoTimestamp,
        };
    }
}
