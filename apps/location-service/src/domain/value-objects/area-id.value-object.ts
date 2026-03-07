import { DomainValidationError } from '../errors/domain-validation.error';

/**
 * AreaId — Value Object
 *
 * Wraps the opaque string identifier of an Area.
 * Validates non-empty. Does not enforce UUID format because
 * the value originates from the database.
 * No dependency on NestJS, Prisma, or any infrastructure concern.
 */
export class AreaId {
    private readonly _value: string;

    private constructor(value: string) {
        this._value = value;
    }

    static create(value: string): AreaId {
        if (!value || value.trim().length === 0) {
            throw new DomainValidationError('AreaId must not be empty');
        }
        return new AreaId(value.trim());
    }

    get value(): string {
        return this._value;
    }

    equals(other: AreaId): boolean {
        return this._value === other._value;
    }
}
