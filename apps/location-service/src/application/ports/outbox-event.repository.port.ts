import { OutboxEvent } from '../../domain/entities/outbox-event.entity';
import { TransactionContext } from './location-transaction.manager.port';

/**
 * IOutboxEventRepository — Application Port
 *
 * Defines the contract for outbox event persistence.
 * Implemented in infrastructure by PrismaOutboxEventRepository.
 *
 * Write side (in-transaction):
 *   insertBatch() — called inside the advisory-locked tx alongside state mutation
 *
 * Poller side (own transactions):
 *   claimPendingBatch() — atomically transitions pending → processing
 *   markPublished()     — called after successful Kafka ACK
 *   resetToRetryable()  — called after Kafka failure; resets to pending
 */
export interface IOutboxEventRepository {
    /**
     * Inserts outbox event rows in the same transaction as user_area_state mutation.
     * Rows are inserted with status='pending'.
     *
     * tx is the Prisma TransactionContext already holding the advisory lock.
     * If the outer transaction rolls back, these rows roll back atomically.
     */
    insertBatch(events: OutboxEventInput[], tx: TransactionContext): Promise<void>;

    /**
     * Atomically claims up to `limit` pending rows by transitioning:
     *   status: 'pending' → 'processing'
     *
     * Uses: UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED) RETURNING *
     *
     * The claim transaction commits before Kafka I/O begins.
     * After commit, claimed rows are 'processing' and invisible to other pollers.
     * This is the primary multi-instance safety mechanism.
     */
    claimPendingBatch(limit: number): Promise<OutboxEvent[]>;

    /**
     * Marks a row as successfully published after Kafka ACK.
     * Sets: status='published', published_at=NOW(), updated_at=NOW()
     * Called outside any transaction — single row update by primary key.
     */
    markPublished(id: string): Promise<void>;

    /**
     * Resets a row to retryable state after Kafka failure.
     * Sets: status='pending', attempts=attempts+1, updated_at=NOW()
     * The row becomes claimable again on the next polling cycle.
     */
    resetToRetryable(id: string): Promise<void>;
}

/**
 * OutboxEventInput
 *
 * Flat data required to create an outbox row.
 * Produced from domain transition events in ProcessLocationUseCase.
 */
export interface OutboxEventInput {
    eventId: string;
    aggregateType: string;
    aggregateId: string | null;
    eventType: string;
    partitionKey: string;
    payload: Record<string, unknown>;
}

export const OUTBOX_EVENT_REPOSITORY = Symbol('IOutboxEventRepository');
