/**
 * DomainValidationError
 *
 * Thrown by domain value objects when invariants are violated.
 * This is a plain Error subclass — it has NO dependency on NestJS,
 * Prisma, or any infrastructure concern.
 *
 * The global HttpExceptionFilter maps this to HTTP 400 VALIDATION_ERROR.
 */
export class DomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainValidationError';
    // Maintains proper prototype chain in compiled ES5/CommonJS output
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
