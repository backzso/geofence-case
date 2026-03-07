import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';

interface HealthResponse {
  status: 'ok' | 'unavailable';
  service: string;
}

/**
 * HealthController — Readiness Endpoint
 *
 * GET /health is a READINESS probe, not a liveness probe.
 * Readiness means the service is ready to accept and process traffic.
 *
 * The probe validates via PrismaService.checkSchemaReadiness():
 *   (a) DB connection can be established
 *   (b) geofence schema exists and is in the search path
 *   (c) areas table is present
 *
 * Zero rows = PASSING (empty table on fresh deployment is normal).
 * Any thrown exception = FAILING → 503 ServiceUnavailable.
 *
 * The probe logic lives in PrismaService — not inlined here.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async check(): Promise<HealthResponse> {
    try {
      await this.prisma.checkSchemaReadiness();
      return { status: 'ok', service: 'geofence-service' };
    } catch {
      // Throw ServiceUnavailableException so the global filter returns 503
      // with a consistent ApiErrorResponse shape.
      throw new ServiceUnavailableException({
        status: 'unavailable',
        service: 'geofence-service',
      });
    }
  }
}
