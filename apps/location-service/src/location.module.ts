import { Module } from '@nestjs/common';

import { GEOFENCE_READ_REPOSITORY } from './application/ports/geofence-read.repository.port';
import { USER_AREA_STATE_REPOSITORY } from './application/ports/user-area-state.repository.port';
import { OUTBOX_EVENT_REPOSITORY } from './application/ports/outbox-event.repository.port';
import { USER_PROCESSING_WATERMARK_REPOSITORY } from './application/ports/user-processing-watermark.repository.port';
import { OUTBOX_PUBLISHER } from './application/ports/outbox.publisher.port';
import { LOCATION_TRANSACTION_MANAGER } from './application/ports/location-transaction.manager.port';

import { ProcessLocationUseCase } from './application/use-cases/process-location.use-case';
import { DispatchPendingOutboxEventsUseCase } from './application/use-cases/dispatch-pending-outbox-events.use-case';

import { PrismaService } from './infrastructure/persistence/prisma.service';
import { PrismaGeofenceReadRepository } from './infrastructure/persistence/prisma-geofence-read.repository';
import { PrismaUserAreaStateRepository } from './infrastructure/persistence/prisma-user-area-state.repository';
import { PrismaUserProcessingWatermarkRepository } from './infrastructure/persistence/prisma-user-processing-watermark.repository';
import { PrismaLocationTransactionManager } from './infrastructure/persistence/prisma-location-transaction.manager';
import { PrismaOutboxEventRepository } from './infrastructure/persistence/prisma-outbox-event.repository';
import { KafkaOutboxPublisher } from './infrastructure/messaging/kafka-outbox.publisher';
import { OutboxPollerService } from './infrastructure/messaging/outbox-poller.service';

import { LocationsController } from './presentation/controllers/locations.controller';
import { HealthController } from './presentation/controllers/health.controller';

/**
 * LocationModule
 *
 * Wires together all layers of the Location Service.
 *
 * OUTBOX PATTERN additions (v2):
 *   - PrismaOutboxEventRepository  → IOutboxEventRepository port
 *   - KafkaOutboxPublisher         → IOutboxPublisher port
 *   - DispatchPendingOutboxEventsUseCase
 *   - OutboxPollerService          — lifecycle-managed polling loop
 *
 * Removed:
 *   - KafkaAreaTransitionPublisher  (no longer used — Kafka is async via outbox)
 *   - AREA_TRANSITION_PUBLISHER binding
 */
@Module({
    controllers: [LocationsController, HealthController],
    providers: [
        PrismaService,

        // Persistence repositories
        {
            provide: GEOFENCE_READ_REPOSITORY,
            useClass: PrismaGeofenceReadRepository,
        },
        {
            provide: USER_AREA_STATE_REPOSITORY,
            useClass: PrismaUserAreaStateRepository,
        },
        {
            provide: OUTBOX_EVENT_REPOSITORY,
            useClass: PrismaOutboxEventRepository,
        },
        {
            provide: USER_PROCESSING_WATERMARK_REPOSITORY,
            useClass: PrismaUserProcessingWatermarkRepository,
        },

        // Transaction manager
        {
            provide: LOCATION_TRANSACTION_MANAGER,
            useClass: PrismaLocationTransactionManager,
        },

        // Outbox publisher
        {
            provide: OUTBOX_PUBLISHER,
            useClass: KafkaOutboxPublisher,
        },

        // Use cases
        ProcessLocationUseCase,
        DispatchPendingOutboxEventsUseCase,

        // Infrastructure services
        OutboxPollerService,
    ],
})
export class LocationModule { }
