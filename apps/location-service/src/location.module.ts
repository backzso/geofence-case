import { Module } from '@nestjs/common';

import { GEOFENCE_READ_REPOSITORY } from './application/ports/geofence-read.repository.port';
import { USER_AREA_STATE_REPOSITORY } from './application/ports/user-area-state.repository.port';
import { AREA_TRANSITION_PUBLISHER } from './application/ports/area-transition.publisher.port';
import { LOCATION_TRANSACTION_MANAGER } from './application/ports/location-transaction.manager.port';

import { ProcessLocationUseCase } from './application/use-cases/process-location.use-case';

import { PrismaService } from './infrastructure/persistence/prisma.service';
import { PrismaGeofenceReadRepository } from './infrastructure/persistence/prisma-geofence-read.repository';
import { PrismaUserAreaStateRepository } from './infrastructure/persistence/prisma-user-area-state.repository';
import { PrismaLocationTransactionManager } from './infrastructure/persistence/prisma-location-transaction.manager';
import { KafkaAreaTransitionPublisher } from './infrastructure/messaging/kafka-area-transition.publisher';

import { LocationsController } from './presentation/controllers/locations.controller';
import { HealthController } from './presentation/controllers/health.controller';

/**
 * LocationModule
 *
 * Wires together all layers of the Location Service:
 *
 *   Infrastructure:
 *     - PrismaService                    — DB connection lifecycle
 *     - PrismaGeofenceReadRepository     → IGeofenceReadRepository port
 *     - PrismaUserAreaStateRepository    → IUserAreaStateRepository port
 *     - PrismaLocationTransactionManager → ILocationTransactionManager port
 *     - KafkaAreaTransitionPublisher     → IAreaTransitionPublisher port
 *
 *   Application:
 *     - ProcessLocationUseCase           — injected with all 4 ports
 *
 *   Presentation:
 *     - LocationsController              — POST /locations
 *     - HealthController                 — GET /health
 *
 * Symbol tokens are used for port bindings to avoid magic strings.
 */
@Module({
    controllers: [LocationsController, HealthController],
    providers: [
        PrismaService,
        {
            provide: GEOFENCE_READ_REPOSITORY,
            useClass: PrismaGeofenceReadRepository,
        },
        {
            provide: USER_AREA_STATE_REPOSITORY,
            useClass: PrismaUserAreaStateRepository,
        },
        {
            provide: AREA_TRANSITION_PUBLISHER,
            useClass: KafkaAreaTransitionPublisher,
        },
        {
            provide: LOCATION_TRANSACTION_MANAGER,
            useClass: PrismaLocationTransactionManager,
        },
        ProcessLocationUseCase,
    ],
})
export class LocationModule { }
