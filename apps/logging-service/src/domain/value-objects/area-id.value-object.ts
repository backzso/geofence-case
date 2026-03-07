import { DomainValidationError } from '../errors/domain-validation.error';

/**
 * AreaId — Value Object
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
}
