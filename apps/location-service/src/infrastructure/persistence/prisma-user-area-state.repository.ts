import { Injectable } from '@nestjs/common';
import {
    InsideAreaRecord,
    IUserAreaStateRepository,
} from '../../application/ports/user-area-state.repository.port';
import { TransactionContext } from '../../application/ports/location-transaction.manager.port';
import { Prisma } from './generated';

/**
 * PrismaUserAreaStateRepository
 *
 * Manages the location.user_area_state table.
 * All methods receive a TransactionContext which is the Prisma transaction client
 * already holding the advisory lock for the user.
 *
 * State model (Option B):
 *   - Only INSIDE rows are stored
 *   - Absence of a row implies the user is outside that area
 *   - Transition: INSERT = ENTER, DELETE = EXIT
 *
 * All writes are guarded by updated_at <= timestamp to prevent
 * older events from overwriting newer state.
 */
@Injectable()
export class PrismaUserAreaStateRepository implements IUserAreaStateRepository {
    /**
     * Loads all inside-area records for a user.
     * The advisory lock is already held — no FOR UPDATE needed.
     */
    async loadInsideAreas(
        userId: string,
        tx: TransactionContext,
    ): Promise<InsideAreaRecord[]> {
        const client = tx as Prisma.TransactionClient;

        const rows = await client.$queryRaw<
            Array<{ area_id: string; updated_at: Date }>
        >`
      SELECT area_id, updated_at
      FROM location.user_area_state
      WHERE user_id = ${userId}::uuid
    `;

        return rows.map((row) => ({
            areaId: row.area_id,
            updatedAt: row.updated_at,
        }));
    }

    /**
     * Persists state changes within the advisory-locked transaction.
     *
     * For exited areas:
     *   DELETE rows only if updated_at <= incoming timestamp.
     *
     * For entered areas:
     *   Batched INSERT with ON CONFLICT upsert — only updates if existing
     *   updated_at <= incoming timestamp. Uses a single multi-row INSERT
     *   to minimize lock hold time under high area fan-out.
     */
    async applyStateChanges(
        userId: string,
        enteredAreaIds: string[],
        exitedAreaIds: string[],
        timestamp: Date,
        tx: TransactionContext,
    ): Promise<void> {
        const client = tx as Prisma.TransactionClient;

        // Delete exited area rows (guarded by timestamp)
        if (exitedAreaIds.length > 0) {
            await client.$executeRaw`
        DELETE FROM location.user_area_state
        WHERE user_id = ${userId}::uuid
          AND area_id = ANY(${exitedAreaIds}::uuid[])
          AND updated_at <= ${timestamp}
      `;
        }

        // Batched insert for entered areas with upsert guard.
        // Single multi-row INSERT instead of per-area loop to reduce
        // round-trips and advisory lock hold time.
        if (enteredAreaIds.length > 0) {
            const valueRows = Prisma.join(
                enteredAreaIds.map(
                    (areaId) =>
                        Prisma.sql`(${userId}::uuid, ${areaId}::uuid, ${timestamp})`,
                ),
            );

            await client.$executeRaw`
        INSERT INTO location.user_area_state (user_id, area_id, updated_at)
        VALUES ${valueRows}
        ON CONFLICT (user_id, area_id)
        DO UPDATE SET updated_at = EXCLUDED.updated_at
        WHERE location.user_area_state.updated_at <= EXCLUDED.updated_at
      `;
        }
    }
}
