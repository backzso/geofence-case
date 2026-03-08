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
    USER_PROCESSING_WATERMARK_REPOSITORY,
    IUserProcessingWatermarkRepository,
} from '../ports/user-processing-watermark.repository.port';
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
 * Orchestrates location processing via Transactional Outbox Pattern.
 * 
 * Flow:
 * 1. PostGIS spatial query (outside transaction to avoid long lock holds on index scans)
 * 2. Advisory-locked transaction to prevent same-user race conditions
 * 3. Watermark/staleness validation to prevent out-of-order execution
 * 4. Atomic commit of state mutation + outbox event intent
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
        @Inject(USER_PROCESSING_WATERMARK_REPOSITORY)
        private readonly watermarkRepo: IUserProcessingWatermarkRepository,
        @Inject(LOCATION_TRANSACTION_MANAGER)
        private readonly transactionManager: ILocationTransactionManager,
    ) { }

    async execute(command: ProcessLocationCommand): Promise<ProcessLocationResult> {
        // 1. Build domain value objects — validates input
        const userId = UserId.create(command.userId);
        const point = GeoPoint.create(command.lat, command.lon);
        const timestamp = LocationTimestamp.create(command.timestamp);

        // 1. Spatial query (Outside lock to maximize throughput)
        const currentInsideAreaIds = await this.geofenceReadRepo.findContainingAreaIds(
            point.lon,
            point.lat,
        );
        const currentInsideSet = new Set(currentInsideAreaIds);

        // 2. Transactional processing under user-scoped advisory lock
        const { enteredAreaIds, exitedAreaIds } =
            await this.transactionManager.executeInTransaction(
                userId.value,
                async (tx) => {
                    // 2a. Watermark check to reject stale/duplicate timestamps
                    const watermark = await this.watermarkRepo.findWatermark(userId.value, tx);
                    if (watermark && watermark.lastProcessedAt >= timestamp.value) {
                        return { enteredAreaIds: [], exitedAreaIds: [] };
                    }

                    // 2b. Load previous inside-state (under lock)
                    const previousRecords = await this.userAreaStateRepo.loadInsideAreas(
                        userId.value,
                        tx,
                    );

                    // 2c. State staleness fallback check
                    if (previousRecords.length > 0) {
                        const maxUpdatedAt = previousRecords.reduce(
                            (max, record) =>
                                record.updatedAt > max ? record.updatedAt : max,
                            previousRecords[0].updatedAt,
                        );

                        if (maxUpdatedAt >= timestamp.value) {
                            return { enteredAreaIds: [], exitedAreaIds: [] };
                        }
                    }

                    // 2d. Compute transitions via set-difference logic
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
                        // 2e. Apply state mutation
                        await this.userAreaStateRepo.applyStateChanges(
                            userId.value,
                            transitions.enteredAreaIds,
                            transitions.exitedAreaIds,
                            timestamp.value,
                            tx,
                        );

                        // 2f. Generate outbox intents
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

                        // 2g. Persist outbox intents atomically with state mutation
                        await this.outboxRepo.insertBatch(outboxInputs, tx);
                    }

                    // 2h. Update user watermark
                    await this.watermarkRepo.upsertWatermark(userId.value, timestamp.value, tx);

                    return transitions;
                },
            );

        // 3. Orchestration complete; Kafka publish handled asynchronously by poller
        return {
            userId: userId.value,
            enteredAreaIds,
            exitedAreaIds,
            timestamp: timestamp.value.toISOString(),
        };
    }
}
