import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from './generated';

/**
 * PrismaService
 *
 * Wraps PrismaClient and manages the connection lifecycle within the NestJS DI container.
 * Also exposes the schema-aware readiness probe used by the health endpoint.
 *
 * All raw SQL for geometry and spatial operations belongs in PrismaAreaRepository,
 * not here. This service is responsible for connection management only.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  /**
   * Schema-aware readiness probe.
   *
   * Validates three things:
   *   (a) A DB connection can be established
   *   (b) The geofence schema exists and is in the search path
   *   (c) The areas table is present
   *
   * A zero-row result is a PASSING probe — the table may be empty on fresh deployment.
   * The probe succeeds if the query executes without throwing, regardless of row count.
   *
   * Throws if the DB is unreachable, the schema is missing, or the table does not exist.
   */
  async checkSchemaReadiness(): Promise<void> {
    // This query will throw if the schema or table does not exist.
    // An empty result set (0 rows) is still a successful execution.
    await this.$queryRawUnsafe('SELECT 1 FROM geofence.areas LIMIT 1');
  }
}
