import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateAreaUseCase } from '../../application/use-cases/create-area.use-case';
import { ListAreasUseCase } from '../../application/use-cases/list-areas.use-case';
import { CreateAreaDto } from '../dto/create-area.dto';
import { AreaSummaryResponseDto } from '../dto/area-summary.response.dto';

/**
 * REST controller for geofence areas.
 */
@Controller('areas')
export class AreasController {
  constructor(
    private readonly createAreaUseCase: CreateAreaUseCase,
    private readonly listAreasUseCase: ListAreasUseCase,
  ) { }


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


  @Get()
  @HttpCode(HttpStatus.OK)
  async listAreas(): Promise<AreaSummaryResponseDto[]> {
    const summaries = await this.listAreasUseCase.execute();
    return summaries.map(AreaSummaryResponseDto.from);
  }
}
