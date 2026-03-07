import { Module } from '@nestjs/common';
import { AREA_TRANSITION_LOG_REPOSITORY } from './application/ports/area-transition-log.repository.port';
import { PersistAreaTransitionLogUseCase } from './application/use-cases/persist-area-transition-log.use-case';
import { GetAreaTransitionLogsUseCase } from './application/use-cases/get-area-transition-logs.use-case';
import { PrismaService } from './infrastructure/persistence/prisma.service';
import { PrismaAreaTransitionLogRepository } from './infrastructure/persistence/prisma-area-transition-log.repository';
import { KafkaAreaTransitionConsumer } from './infrastructure/messaging/kafka-area-transition.consumer';
import { LogsController } from './presentation/controllers/logs.controller';
import { HealthController } from './presentation/controllers/health.controller';

/**
 * LoggingModule
 *
 * Wires all layers of the Logging Service:
 *
 *   Infrastructure:
 *     - PrismaService                          — DB connection lifecycle
 *     - PrismaAreaTransitionLogRepository      → IAreaTransitionLogRepository port
 *     - KafkaAreaTransitionConsumer            — event consumption lifecycle
 *
 *   Application:
 *     - PersistAreaTransitionLogUseCase        — write path
 *     - GetAreaTransitionLogsUseCase           — read path
 *
 *   Presentation:
 *     - LogsController                         — GET /logs
 *     - HealthController                       — GET /health
 */
@Module({
    controllers: [LogsController, HealthController],
    providers: [
        PrismaService,
        {
            provide: AREA_TRANSITION_LOG_REPOSITORY,
            useClass: PrismaAreaTransitionLogRepository,
        },
        PersistAreaTransitionLogUseCase,
        GetAreaTransitionLogsUseCase,
        KafkaAreaTransitionConsumer,
    ],
})
export class LoggingModule { }
