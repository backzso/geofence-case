import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainValidationError } from '../../domain/errors/domain-validation.error';

/**
 * ApiErrorResponse — standardized error shape for all error responses.
 * Controllers must never expose raw Prisma errors or stack traces.
 */
interface ApiErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * HttpExceptionFilter — Global Exception Filter
 *
 * Maps all exceptions to a standardized ApiErrorResponse:
 *
 *   DomainValidationError  → 400 VALIDATION_ERROR
 *   HttpException          → preserves HTTP status, wraps in ApiErrorResponse
 *   Anything else          → 500 INTERNAL_ERROR (raw error NEVER exposed to client)
 *
 * This is the single entry point for all error translation.
 * Raw Prisma errors, stack traces, and DB messages are logged server-side only.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number;
    let body: ApiErrorResponse;

    if (exception instanceof DomainValidationError) {
      statusCode = HttpStatus.BAD_REQUEST;
      body = {
        code: 'VALIDATION_ERROR',
        message: exception.message,
      };
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // NestJS ValidationPipe produces an object with `message: string[]`
      // when class-validator fails. Preserve those details.
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const raw = exceptionResponse as Record<string, unknown>;
        body = {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload',
          details: raw['message'] ?? undefined,
        };
      } else {
        body = {
          code: 'HTTP_ERROR',
          message: String(exceptionResponse),
        };
      }
    } else {
      // Unknown / infrastructure errors — log server-side, never expose details
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      body = {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      };
    }

    response.status(statusCode).json(body);
  }
}
