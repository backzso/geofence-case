import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ProcessLocationUseCase } from '../../application/use-cases/process-location.use-case';
import { ProcessLocationDto } from '../dto/process-location.dto';
import { ProcessLocationResponseDto } from '../dto/process-location.response.dto';

/**
 * REST controller for location ingestion.
 */
@Controller('locations')
export class LocationsController {
    constructor(
        private readonly processLocationUseCase: ProcessLocationUseCase,
    ) { }


    @Post()
    @HttpCode(HttpStatus.OK)
    async processLocation(
        @Body() dto: ProcessLocationDto,
    ): Promise<ProcessLocationResponseDto> {
        const result = await this.processLocationUseCase.execute({
            userId: dto.userId,
            lat: dto.lat,
            lon: dto.lon,
            timestamp: dto.timestamp,
        });
        return ProcessLocationResponseDto.from(result);
    }
}
