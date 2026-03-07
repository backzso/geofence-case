import { DomainValidationError } from '../errors/domain-validation.error';

/**
 * LocationTimestamp — Value Object
 *
 * Wraps a Date representing the timestamp of a location ping.
 * Validates that the input is a parseable ISO 8601 date.
 * Stores the value as UTC.
 *
 * No future-timestamp guard is applied — the domain does not
 * reject future timestamps in this step.
 *
 * No dependency on NestJS, Prisma, or any infrastructure concern.
 */
export class LocationTimestamp {
    private readonly _value: Date;

    private constructor(value: Date) {
        this._value = value;
    }

    static create(raw: string | Date): LocationTimestamp {
        const date = raw instanceof Date ? raw : new Date(raw);

        if (isNaN(date.getTime())) {
            throw new DomainValidationError(
                `timestamp must be a valid ISO 8601 date, got: ${raw}`,
            );
        }

        return new LocationTimestamp(date);
    }

    get value(): Date {
        return this._value;
    }
}
