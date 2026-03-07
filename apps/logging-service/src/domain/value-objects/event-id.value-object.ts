import { DomainValidationError } from '../errors/domain-validation.error';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * EventId — Value Object
 *
 * Wraps the UUID identifier of a Kafka transition event.
 * Serves as the idempotency key for deduplication.
 */
export class EventId {
    private readonly _value: string;

    private constructor(value: string) {
        this._value = value;
    }

    static create(raw: string): EventId {
        if (!raw || raw.trim().length === 0) {
            throw new DomainValidationError('EventId must not be empty');
        }
        const trimmed = raw.trim().toLowerCase();
        if (!UUID_REGEX.test(trimmed)) {
            throw new DomainValidationError(`EventId must be a valid UUID, got: ${raw}`);
        }
        return new EventId(trimmed);
    }

    get value(): string {
        return this._value;
    }
}
