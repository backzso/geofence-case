import { Injectable } from '@nestjs/common';
import {
    IUserProcessingWatermarkRepository,
    UserProcessingWatermarkRecord,
} from '../../application/ports/user-processing-watermark.repository.port';
import { TransactionContext } from '../../application/ports/location-transaction.manager.port';
import { Prisma } from './generated';

/**
 * PrismaUserProcessingWatermarkRepository
 *
 * Infrastructure implementation for the user watermark port using Prisma.
 * All methods use the provided TransactionContext, which holds the advisory lock.
 */
@Injectable()
export class PrismaUserProcessingWatermarkRepository implements IUserProcessingWatermarkRepository {
    /**
     * Retrieves the watermark by user_id
     */
    async findWatermark(userId: string, tx: TransactionContext): Promise<UserProcessingWatermarkRecord | null> {
        const client = tx as Prisma.TransactionClient;

        const rows = await client.$queryRaw<
            Array<{ user_id: string; last_processed_at: Date; updated_at: Date }>
        >`
      SELECT user_id, last_processed_at, updated_at
      FROM location.user_processing_watermarks
      WHERE user_id = ${userId}::uuid
    `;

        if (rows.length === 0) {
            return null;
        }

        const row = rows[0];
        return {
            userId: row.user_id,
            lastProcessedAt: row.last_processed_at,
            updatedAt: row.updated_at,
        };
    }

    /**
     * Upserts the user.
     * This query safely INSERTS on clean start, and UPDATES on conflict ONLY IF
     * the new timestamp is newer than the old one. We include EXCLUDED.last_processed_at > location.user_processing_watermarks.last_processed_at
     * as a strict safety check to ensure watermarks never move backwards.
     */
    async upsertWatermark(userId: string, timestamp: Date, tx: TransactionContext): Promise<void> {
        const client = tx as Prisma.TransactionClient;

        await client.$executeRaw`
      INSERT INTO location.user_processing_watermarks (user_id, last_processed_at, updated_at)
      VALUES (${userId}::uuid, ${timestamp}, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET 
        last_processed_at = EXCLUDED.last_processed_at,
        updated_at = NOW()
      WHERE location.user_processing_watermarks.last_processed_at < EXCLUDED.last_processed_at
    `;
    }
}
