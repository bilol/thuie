import {
  ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiException } from './api.exception';

/**
 * Formats every thrown error into the BACKEND.md §5 body:
 * `{ code, message, details?, requestId, errors? }` — never a Nest default shape.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = req.requestId ?? '';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Record<string, unknown> = {
      code: 'internal_error',
      message: 'Unexpected server error',
      requestId,
    };

    if (exception instanceof ApiException) {
      status = exception.getStatus();
      const r = exception.getResponse() as any;
      body = {
        code: exception.code,
        message: r.message ?? exception.message,
        requestId,
      };
      if (r.details !== undefined) body.details = r.details;
      if (r.errors !== undefined) body.errors = r.errors;
      // §5: 429 carries Retry-After
      if (exception.code === 'rate_limited' && r.details?.retryAfter) {
        res.setHeader('Retry-After', String(r.details.retryAfter));
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse() as any;
      // ValidationPipe failures arrive as BadRequestException with message[]
      if (Array.isArray(r.message)) {
        body = {
          code: 'validation_failed',
          message: 'Validation failed',
          requestId,
          errors: r.message.map((m: string) => ({
            field: m.split(' ')[0],
            message: m,
          })),
        };
        status = HttpStatus.UNPROCESSABLE_ENTITY; // 422 per §5
      } else {
        const code =
          status === 401 ? 'token_expired' :
          status === 403 ? 'permission_denied' :
          status === 404 ? 'not_found' : 'malformed_request';
        body = { code, message: typeof r === 'string' ? r : (r.message ?? 'Request error'), requestId };
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    if (status >= 500) this.logger.error(`5xx on ${req.method} ${req.url}`, JSON.stringify(body));
    res.status(status).json(body);
  }
}
