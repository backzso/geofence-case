import { Injectable } from '@nestjs/common';
import {
    InsideAreaRecord,
    IUserAreaStateRepository,
} from '../../application/ports/user-area-state.repository.port';
import { TransactionContext } from '../../application/ports/location-transaction.manager.port';
import { Prisma } from './generated';

/**
 * Manages user_area_state tracking.
 * Only stores INSIDE status; absence of a row implies OUTSIDE.
 * Write paths are strictly guarded by updated_at checks.
 */
@Injectable()
export class PrismaUserAreaStateRepository implements IUserAreaStateRepository {

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

        // Batched insert with ON CONFLICT updated_at guard
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
