import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Rfc7807ProblemDetails } from '@devflow/shared-types';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;

    const traceId = (request.headers['x-request-id'] as string) || 'unknown';

    let title = 'Internal Server Error';
    let detail = 'An unexpected internal error occurred.';
    let code = 'INTERNAL_ERROR';
    let validationErrors: Array<{ field: string; message: string }> | undefined;

    if (exception instanceof HttpException) {
      title = exception.name.replace(/([A-Z])/g, ' $1').trim();
      if (typeof exceptionResponse === 'string') {
        detail = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resObj = exceptionResponse as Record<string, unknown>;
        detail = (resObj.message as string) || exception.message;
        code = (resObj.error as string) || `HTTP_${status}`;

        if (Array.isArray(resObj.message)) {
          detail = 'Validation failed for the request payload.';
          validationErrors = resObj.message.map((msg: string) => {
            const parts = msg.split(' ');
            return {
              field: parts[0] || 'field',
              message: msg,
            };
          });
        }
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
    }

    const problemDetails: Rfc7807ProblemDetails = {
      type: `https://api.devflow.ai/errors/${code.toLowerCase().replace(/_/g, '-')}`,
      title,
      status,
      detail,
      instance: request.originalUrl || request.url,
      code,
      timestamp: new Date().toISOString(),
      traceId,
      ...(validationErrors ? { errors: validationErrors } : {}),
    };

    response.status(status).json(problemDetails);
  }
}
