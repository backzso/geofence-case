import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ProcessLocationUseCase } from '../../application/use-cases/process-location.use-case';
import { ProcessLocationDto } from '../dto/process-location.dto';
import { ProcessLocationResponseDto } from '../dto/process-location.response.dto';

/**
 * LocationsController — Thin Presentation Layer
 *
 * Responsibilities:
 *   - Parse and validate HTTP input (delegated to ValidationPipe + DTO)
 *   - Invoke the use case
 *   - Map use case output to HTTP response DTO
 *   - Return the correct HTTP status code
 *
 * No business logic here. No direct repository, Prisma, or Kafka access.
 */
@Controller('locations')
export class LocationsController {
    constructor(
        private readonly processLocationUseCase: ProcessLocationUseCase,
    ) { }

    /**
     * POST /locations
     *
     * Ingests a user location ping and computes geofence transitions.
     * Returns 200 with entered/exited area IDs.
     */
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
