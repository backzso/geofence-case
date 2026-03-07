import { DomainValidationError } from '../errors/domain-validation.error';

/**
 * AreaName — Value Object
 *
 * Enforces:
 *   - required (non-null, non-undefined)
 *   - non-empty after trimming
 *   - maximum length of 120 characters (after trimming)
 *
 * Stores the trimmed value. No dependency on NestJS, Prisma, or HTTP concerns.
 */
export class AreaName {
  static readonly MAX_LENGTH = 120;

  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(raw: string): AreaName {
    if (raw === null || raw === undefined) {
      throw new DomainValidationError('AreaName is required');
    }

    const trimmed = raw.trim();

    if (trimmed.length === 0) {
      throw new DomainValidationError('AreaName must not be empty or whitespace-only');
    }

    if (trimmed.length > AreaName.MAX_LENGTH) {
      throw new DomainValidationError(
        `AreaName must not exceed ${AreaName.MAX_LENGTH} characters`,
      );
    }

    return new AreaName(trimmed);
  }

  get value(): string {
    return this._value;
  }

  equals(other: AreaName): boolean {
    return this._value === other._value;
  }
}
