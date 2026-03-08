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
 * Orchestrates geofence creation: Validates circle input and delegates PostGIS polygon creation.
 */
@Injectable()
export class CreateAreaUseCase {
  constructor(
    @Inject(AREA_REPOSITORY)
    private readonly areaRepository: IAreaRepository,
  ) { }

  async execute(command: CreateAreaCommand): Promise<AreaSummary> {
    const name = AreaName.create(command.name);
    const circle = GeoCircle.create(command.centerLat, command.centerLon, command.radiusM);

    const area = Area.forCreation(name, circle);

    // Repository handles PostGIS compilation and transactional INSERT
    return await this.areaRepository.save(area);
  }
}
