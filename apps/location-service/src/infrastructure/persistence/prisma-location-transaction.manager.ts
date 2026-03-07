import { Injectable } from '@nestjs/common';
import {
    ILocationTransactionManager,
    TransactionContext,
} from '../../application/ports/location-transaction.manager.port';
import { PrismaService } from './prisma.service';
import { Prisma } from './generated';

/**
 * PrismaLocationTransactionManager
 *
 * Infrastructure implementation of ILocationTransactionManager.
 *
 * Opens a Prisma interactive transaction and acquires a PostgreSQL
 * advisory transaction lock keyed by hashtext(userId).
 *
 * Why advisory lock instead of SELECT FOR UPDATE:
 *   SELECT FOR UPDATE only locks existing rows. When no rows exist
 *   for a user (first location ping), concurrent requests could both
 *   proceed and emit duplicate ENTER events. The advisory lock serializes
 *   ALL concurrent requests for the same userId regardless of existing rows.
 *
 * The lock is automatically released when the transaction commits or rolls back.
 * Different userIds are fully concurrent — locking is user-scoped, not table-wide.
 */
@Injectable()
export class PrismaLocationTransactionManager implements ILocationTransactionManager {
    constructor(private readonly prisma: PrismaService) { }

    async executeInTransaction<T>(
        userId: string,
        callback: (tx: TransactionContext) => Promise<T>,
    ): Promise<T> {
        return this.prisma.$transaction(
            async (tx: Prisma.TransactionClient) => {
                // Acquire user-scoped advisory lock.
                // pg_advisory_xact_lock blocks until the lock is available.
                // hashtext() converts the UUID string to a 32-bit integer key.
                // Released automatically on commit/rollback.
                await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;

                return callback(tx);
            },
            {
                // Explicit timeout to handle advisory lock contention.
                // Default Prisma timeout is 5s, which can be exceeded when
                // concurrent requests for the same user queue on the lock.
                maxWait: 5000,  // max time to acquire a connection from the pool
                timeout: 10000, // max time for the entire transaction to complete
            },
        );
    }
}
