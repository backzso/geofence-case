import { Inject, Injectable } from '@nestjs/common';
import { AreaId } from '../../domain/value-objects/area-id.value-object';
import { AreaName } from '../../domain/value-objects/area-name.value-object';
import { GeoCircle } from '../../domain/value-objects/geo-circle.value-object';
import { Area } from '../../domain/entities/area.entity';
import {
  AREA_REPOSITORY,
  AreaSummary,
  IAreaRepository,
} from '../ports/area.repository.port';

export interface CreateAreaCommand {
  name: string;
  centerLat: number;
  centerLon: number;
  radiusM: number;
}

/**
 * CreateAreaUseCase
 *
 * Orchestrates the creation of a new geofence area:
 *   1. Validate input via domain value objects (throws DomainValidationError on failure)
 *   2. Construct the Area entity
 *   3. Delegate persistence to IAreaRepository.save()
 *   4. Return the AreaSummary (id, name, createdAt) from the repository
 *
 * No raw SQL. No Prisma. No HTTP concerns.
 * The GeoCircle is passed to the repository, which translates it to PostGIS geometry.
 * After persistence this value object is no longer referenced.
 */
@Injectable()
export class CreateAreaUseCase {
  constructor(
    @Inject(AREA_REPOSITORY)
    private readonly areaRepository: IAreaRepository,
  ) {}

  async execute(command: CreateAreaCommand): Promise<AreaSummary> {
    // Domain validation — value object constructors throw DomainValidationError
    // if any invariant is violated. This happens BEFORE any persistence attempt.
    const name = AreaName.create(command.name);
    const circle = GeoCircle.create(command.centerLat, command.centerLon, command.radiusM);

    // AreaId and createdAt are not known at construction time; the real DB-generated
    // values are returned from the repository's INSERT ... RETURNING clause.
    const area = Area.forCreation(name, circle);

    // Repository handles the PostGIS ST_Buffer computation and the transactional INSERT.
    // Returns AreaSummary with DB-generated id and createdAt.
    const summary = await this.areaRepository.save(area);

    return summary;
  }
}
