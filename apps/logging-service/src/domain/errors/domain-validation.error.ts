/**
 * DomainValidationError
 *
 * Thrown by domain value objects when invariants are violated.
 * Zero dependency on NestJS, Prisma, or infrastructure.
 * The global HttpExceptionFilter maps this to HTTP 400 VALIDATION_ERROR.
 */
export class DomainValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DomainValidationError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
