import { Injectable } from '@nestjs/common';
import {
    ILocationTransactionManager,
    TransactionContext,
} from '../../application/ports/location-transaction.manager.port';
import { PrismaService } from './prisma.service';
import { Prisma } from './generated';

/**
 * Implements user-scoped PostgreSQL advisory locks keyed by hashtext(userId).
 * 
 * Advisory locks prevent same-user race conditions without relying on 
 * SELECT FOR UPDATE, which fails to lock non-existent rows during a user's first entry.
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
                // Acquire lock that releases automatically on commit/rollback
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
