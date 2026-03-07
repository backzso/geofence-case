import { DomainValidationError } from '../errors/domain-validation.error';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * UserId — Value Object
 *
 * Wraps a UUID string identifying a user.
 * Validates non-empty and UUID v4 format.
 * No dependency on NestJS, Prisma, or any infrastructure concern.
 */
export class UserId {
    private readonly _value: string;

    private constructor(value: string) {
        this._value = value;
    }

    static create(raw: string): UserId {
        if (!raw || raw.trim().length === 0) {
            throw new DomainValidationError('UserId must not be empty');
        }

        const trimmed = raw.trim().toLowerCase();

        if (!UUID_REGEX.test(trimmed)) {
            throw new DomainValidationError(`UserId must be a valid UUID, got: ${raw}`);
        }

        return new UserId(trimmed);
    }

    get value(): string {
        return this._value;
    }

    equals(other: UserId): boolean {
        return this._value === other._value;
    }
}
