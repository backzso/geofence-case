import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from './generated';

/**
 * PrismaService
 *
 * Wraps PrismaClient and manages the connection lifecycle within NestJS DI.
 * All raw SQL for spatial queries, state management, and advisory locks
 * belongs in the respective repository/manager implementations, not here.
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
     * Validates that the location schema and user_area_state table exist.
     * Zero rows = PASSING (empty table is normal on fresh deployment).
     */
    async checkSchemaReadiness(): Promise<void> {
        await this.$queryRawUnsafe('SELECT 1 FROM location.user_area_state LIMIT 1');
    }
}
