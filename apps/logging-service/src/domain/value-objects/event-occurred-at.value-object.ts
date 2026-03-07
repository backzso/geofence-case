import { DomainValidationError } from '../errors/domain-validation.error';

/**
 * EventOccurredAt — Value Object
 *
 * Wraps the timestamp from the Kafka event payload.
 * Validates that the input is a parseable ISO 8601 date.
 * Stored as UTC Date for comparison and persistence.
 */
export class EventOccurredAt {
    private readonly _value: Date;

    private constructor(value: Date) {
        this._value = value;
    }

    static create(raw: string | Date): EventOccurredAt {
        const date = raw instanceof Date ? raw : new Date(raw);

        if (isNaN(date.getTime())) {
            throw new DomainValidationError(
                `occurredAt must be a valid ISO 8601 date, got: ${raw}`,
            );
        }

        return new EventOccurredAt(date);
    }

    get value(): Date {
        return this._value;
    }
}
