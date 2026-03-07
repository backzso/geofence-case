import {
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';

/**
 * HealthController
 *
 * GET /health — returns db readiness status.
 * Returns 503 if the database is unreachable.
 */
@Controller('health')
export class HealthController {
    constructor(private readonly prisma: PrismaService) { }

    @Get()
    @HttpCode(HttpStatus.OK)
    async health(): Promise<{ status: string; service: string }> {
        try {
            await this.prisma.checkSchemaReadiness();
        } catch {
            throw new ServiceUnavailableException('Database is not ready');
        }

        return { status: 'ok', service: 'logging-service' };
    }
}
