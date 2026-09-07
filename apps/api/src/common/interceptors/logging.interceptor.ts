import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, originalUrl, ip } = request;
    const userAgent = request.get('user-agent') || 'unknown';
    const requestId = (request.headers['x-request-id'] as string) || 'unknown';
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const { statusCode } = response;
        const duration = Date.now() - startTime;

        this.logger.log(
          JSON.stringify({
            level: 'info',
            message: `${method} ${originalUrl} ${statusCode} - ${duration}ms`,
            requestId,
            method,
            path: originalUrl,
            statusCode,
            durationMs: duration,
            clientIp: ip,
            userAgent,
            timestamp: new Date().toISOString(),
          }),
        );
      }),
    );
  }
}
