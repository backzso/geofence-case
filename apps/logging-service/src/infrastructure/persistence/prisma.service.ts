import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from './generated';

/**
 * PrismaService
 *
 * Wraps PrismaClient and manages the DB connection lifecycle within NestJS DI.
 * All raw SQL belongs in repository implementations, not here.
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
     * Validates that logging.area_transition_logs is accessible.
     * Zero rows = passing (fresh deployment).
     */
    async checkSchemaReadiness(): Promise<void> {
        await this.$queryRawUnsafe(
            'SELECT 1 FROM logging.area_transition_logs LIMIT 1',
        );
    }
}
