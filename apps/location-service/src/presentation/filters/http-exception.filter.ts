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

interface ApiErrorResponse {
    code: string;
    message: string;
    details?: unknown;
}

/**
 * HttpExceptionFilter — Global Exception Filter
 *
 * Maps all exceptions to a standardized ApiErrorResponse:
 *   DomainValidationError  → 400 VALIDATION_ERROR
 *   HttpException          → preserves HTTP status
 *   Anything else          → 500 INTERNAL_ERROR (raw error never exposed)
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

            if (statusCode >= 500) {
                // 5xx — server errors: do not expose internals
                const code =
                    statusCode === HttpStatus.SERVICE_UNAVAILABLE
                        ? 'SERVICE_UNAVAILABLE'
                        : 'INTERNAL_ERROR';
                const message =
                    statusCode === HttpStatus.SERVICE_UNAVAILABLE
                        ? 'Service is temporarily unavailable'
                        : 'An unexpected error occurred';
                body = { code, message };
            } else if (
                typeof exceptionResponse === 'object' &&
                exceptionResponse !== null
            ) {
                // 4xx with structured response (e.g. ValidationPipe errors)
                const raw = exceptionResponse as Record<string, unknown>;
                body = {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request payload',
                    details: raw['message'] ?? undefined,
                };
            } else {
                // 4xx with plain string response
                body = {
                    code: 'VALIDATION_ERROR',
                    message: String(exceptionResponse),
                };
            }
        } else {
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
