/**
 * OutboxEventStatus — Value Object
 *
 * Represents the lifecycle of a single outbox event row.
 *
 * Allowed statuses:
 *   pending    — inserted with the state mutation; waiting to be claimed
 *   processing — atomically claimed by a poller cycle; being published to Kafka
 *   published  — successfully published and acknowledged by Kafka
 *
 * There is no terminal 'failed' status. Failed publishes reset to 'pending'
 * with an incremented attempts counter, making them immediately retryable.
 * This avoids routing logic for a failed state and keeps retry semantics uniform.
 */
export type OutboxEventStatusLiteral = 'pending' | 'processing' | 'published';

const VALID_STATUSES: readonly OutboxEventStatusLiteral[] = [
    'pending',
    'processing',
    'published',
];

export class OutboxEventStatus {
    private readonly _value: OutboxEventStatusLiteral;

    private constructor(value: OutboxEventStatusLiteral) {
        this._value = value;
    }

    static pending(): OutboxEventStatus {
        return new OutboxEventStatus('pending');
    }

    static processing(): OutboxEventStatus {
        return new OutboxEventStatus('processing');
    }

    static published(): OutboxEventStatus {
        return new OutboxEventStatus('published');
    }

    static from(raw: string): OutboxEventStatus {
        if (!VALID_STATUSES.includes(raw as OutboxEventStatusLiteral)) {
            throw new Error(`Unknown OutboxEventStatus: "${raw}"`);
        }
        return new OutboxEventStatus(raw as OutboxEventStatusLiteral);
    }

    get value(): OutboxEventStatusLiteral {
        return this._value;
    }

    isPending(): boolean {
        return this._value === 'pending';
    }

    isProcessing(): boolean {
        return this._value === 'processing';
    }

    isPublished(): boolean {
        return this._value === 'published';
    }
}
