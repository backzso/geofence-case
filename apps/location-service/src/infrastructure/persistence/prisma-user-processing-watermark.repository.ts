import { Injectable } from '@nestjs/common';
import {
    IUserProcessingWatermarkRepository,
    UserProcessingWatermarkRecord,
} from '../../application/ports/user-processing-watermark.repository.port';
import { TransactionContext } from '../../application/ports/location-transaction.manager.port';
import { Prisma } from './generated';

/**
 * Infrastructure implementation for user watermarks.
 * All methods execute within the advisory-locked transaction context.
 */
@Injectable()
export class PrismaUserProcessingWatermarkRepository implements IUserProcessingWatermarkRepository {

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
     * Safely INSERTS on clean start and UPDATES only if timestamp advances forward.
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
