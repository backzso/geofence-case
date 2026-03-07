import { TransactionContext } from './location-transaction.manager.port';

/**
 * InsideAreaRecord — read model for a user's current inside-state.
 * Contains the areaId and the timestamp of the last state update.
 */
export interface InsideAreaRecord {
    areaId: string;
    updatedAt: Date;
}

/**
 * IUserAreaStateRepository — Application Port
 *
 * Manages the user_area_state table.
 * All methods that accept a TransactionContext must be called
 * within an advisory-locked transaction.
 */
export interface IUserAreaStateRepository {
    /**
     * Loads current inside-area records for a user.
     * Called inside the advisory-locked transaction.
     * The advisory lock ensures no concurrent mutation — FOR UPDATE is not needed.
     */
    loadInsideAreas(userId: string, tx: TransactionContext): Promise<InsideAreaRecord[]>;

    /**
     * Persists state changes inside the transaction.
     * - INSERTs rows for entered areas (with ON CONFLICT upsert guard)
     * - DELETEs rows for exited areas
     * Both operations are guarded by updated_at <= timestamp to prevent
     * older events from overwriting newer state.
     */
    applyStateChanges(
        userId: string,
        enteredAreaIds: string[],
        exitedAreaIds: string[],
        timestamp: Date,
        tx: TransactionContext,
    ): Promise<void>;
}

export const USER_AREA_STATE_REPOSITORY = Symbol('IUserAreaStateRepository');
