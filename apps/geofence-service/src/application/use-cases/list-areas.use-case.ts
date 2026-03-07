import { Inject, Injectable } from '@nestjs/common';
import {
  AREA_REPOSITORY,
  AreaSummary,
  IAreaRepository,
} from '../ports/area.repository.port';

/**
 * ListAreasUseCase
 *
 * Returns lightweight AreaSummary projections for all persisted areas.
 * Delegates entirely to the repository's read-model method.
 *
 * No geometry deserialization. No Area entity hydration. No pagination yet
 * (deferred per spec — the port signature is designed to accept optional
 * pagination options in a future step without a breaking change).
 */
@Injectable()
export class ListAreasUseCase {
  constructor(
    @Inject(AREA_REPOSITORY)
    private readonly areaRepository: IAreaRepository,
  ) {}

  async execute(): Promise<AreaSummary[]> {
    return this.areaRepository.findAllSummaries();
  }
}
