import { TransactionContext } from './location-transaction.manager.port';

export interface UserProcessingWatermarkRecord {
    userId: string;
    lastProcessedAt: Date;
    updatedAt: Date;
}

/**
 * IUserProcessingWatermarkRepository — Application Port
 *
 * Manages the user_processing_watermarks table.
 * Used to store a user-level watermark of the last processed location event timestamp,
 * ensuring stale events are discarded even when the user has no active inside-state rows.
 *
 * All methods accept a TransactionContext to participate in the location processing transaction.
 */
export interface IUserProcessingWatermarkRepository {
    /**
     * Finds the watermark for a given user, if it exists.
     * Called inside the advisory-locked transaction.
     */
    findWatermark(userId: string, tx: TransactionContext): Promise<UserProcessingWatermarkRecord | null>;

    /**
     * Upserts the watermark for a given user.
     * Only updates if the incoming timestamp is strictly greater than the existing last_processed_at.
     * Called inside the advisory-locked transaction.
     */
    upsertWatermark(userId: string, timestamp: Date, tx: TransactionContext): Promise<void>;
}

export const USER_PROCESSING_WATERMARK_REPOSITORY = Symbol('IUserProcessingWatermarkRepository');
