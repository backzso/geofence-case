import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';

interface HealthResponse {
    status: 'ok' | 'unavailable';
    service: string;
}

/**
 * HealthController — Readiness Endpoint
 *
 * GET /health validates DB connectivity and schema readiness.
 * Zero rows = PASSING. Any exception = 503 ServiceUnavailable.
 */
@Controller('health')
export class HealthController {
    constructor(private readonly prisma: PrismaService) { }

    @Get()
    @HttpCode(HttpStatus.OK)
    async check(): Promise<HealthResponse> {
        try {
            await this.prisma.checkSchemaReadiness();
            return { status: 'ok', service: 'location-service' };
        } catch {
            throw new ServiceUnavailableException({
                status: 'unavailable',
                service: 'location-service',
            });
        }
    }
}
