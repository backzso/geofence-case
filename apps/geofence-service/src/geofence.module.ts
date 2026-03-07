import { Module } from '@nestjs/common';
import { AREA_REPOSITORY } from './application/ports/area.repository.port';
import { CreateAreaUseCase } from './application/use-cases/create-area.use-case';
import { ListAreasUseCase } from './application/use-cases/list-areas.use-case';
import { PrismaAreaRepository } from './infrastructure/persistence/prisma-area.repository';
import { PrismaService } from './infrastructure/persistence/prisma.service';
import { AreasController } from './presentation/controllers/areas.controller';
import { HealthController } from './presentation/controllers/health.controller';

/**
 * GeofenceModule
 *
 * Wires together all layers of the Geofence Service:
 *   - PrismaService          (infrastructure — DB connection)
 *   - PrismaAreaRepository   (infrastructure — binds to IAreaRepository port)
 *   - CreateAreaUseCase      (application — injected with AREA_REPOSITORY token)
 *   - ListAreasUseCase       (application — injected with AREA_REPOSITORY token)
 *   - AreasController        (presentation — thin, delegates to use cases)
 *   - HealthController       (presentation — readiness probe)
 *
 * The AREA_REPOSITORY symbol token is used instead of the string 'IAreaRepository'
 * to avoid magic strings and keep the binding type-safe.
 */
@Module({
  controllers: [AreasController, HealthController],
  providers: [
    PrismaService,
    {
      provide: AREA_REPOSITORY,
      useClass: PrismaAreaRepository,
    },
    CreateAreaUseCase,
    ListAreasUseCase,
  ],
})
export class GeofenceModule {}
