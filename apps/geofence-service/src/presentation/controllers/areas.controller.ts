import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateAreaUseCase } from '../../application/use-cases/create-area.use-case';
import { ListAreasUseCase } from '../../application/use-cases/list-areas.use-case';
import { CreateAreaDto } from '../dto/create-area.dto';
import { AreaSummaryResponseDto } from '../dto/area-summary.response.dto';

/**
 * AreasController — Thin Presentation Layer
 *
 * Responsibilities:
 *   - Parse and validate HTTP input (delegated to ValidationPipe + DTO)
 *   - Invoke the appropriate use case
 *   - Map use case output to HTTP response DTO
 *   - Return the correct HTTP status code
 *
 * No business logic here. No direct repository or Prisma access.
 * All domain validation and orchestration lives in the use cases.
 */
@Controller('areas')
export class AreasController {
  constructor(
    private readonly createAreaUseCase: CreateAreaUseCase,
    private readonly listAreasUseCase: ListAreasUseCase,
  ) {}

  /**
   * POST /areas
   *
   * Creates a new geofence area from a circle definition.
   * Returns 201 with the created area summary (id, name, createdAt).
   *
   * Invalid payload → 400 VALIDATION_ERROR (handled by ValidationPipe + HttpExceptionFilter)
   * Domain violation → 400 VALIDATION_ERROR (handled by HttpExceptionFilter)
   * Infrastructure failure → 500 INTERNAL_ERROR (handled by HttpExceptionFilter)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createArea(@Body() dto: CreateAreaDto): Promise<AreaSummaryResponseDto> {
    const summary = await this.createAreaUseCase.execute({
      name: dto.name,
      centerLat: dto.centerLat,
      centerLon: dto.centerLon,
      radiusM: dto.radiusM,
    });
    return AreaSummaryResponseDto.from(summary);
  }

  /**
   * GET /areas
   *
   * Returns all geofence areas as lightweight summaries.
   * Pagination is not implemented in this step (deferred per spec).
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async listAreas(): Promise<AreaSummaryResponseDto[]> {
    const summaries = await this.listAreasUseCase.execute();
    return summaries.map(AreaSummaryResponseDto.from);
  }
}
