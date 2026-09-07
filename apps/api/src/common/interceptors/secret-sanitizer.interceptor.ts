import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * DEVFLOW AI — SecretSanitizerInterceptor (Phase 13)
 *
 * Automatically scrubs sensitive credentials, private keys, API secrets,
 * and authorization tokens from outbound HTTP JSON responses.
 */
@Injectable()
export class SecretSanitizerInterceptor implements NestInterceptor {
  private readonly SENSITIVE_KEYS = new Set([
    'password',
    'passwordhash',
    'passhash',
    'jwtsecret',
    'clientsecret',
    'apisecret',
    'tokensecret',
    'webhooksecret',
    'privatekey',
  ]);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => this.sanitize(data)),
    );
  }

  /**
   * Recursively sanitizes objects and arrays
   */
  public sanitize(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      return this.maskSecretsInString(data);
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    if (typeof data === 'object') {
      const sanitizedObj: Record<string, unknown> = {};

      for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
        const lowerKey = key.toLowerCase();

        if (this.SENSITIVE_KEYS.has(lowerKey)) {
          sanitizedObj[key] = '[REDACTED_SECRET]';
        } else {
          sanitizedObj[key] = this.sanitize(val);
        }
      }

      return sanitizedObj;
    }

    return data;
  }

  /**
   * Masks tokens matching known secret patterns in arbitrary string fields
   */
  public maskSecretsInString(text: string): string {
    return text
      .replace(/ghp_[a-zA-Z0-9_-]{20,}/g, 'ghp_***[REDACTED]')
      .replace(/sk-[a-zA-Z0-9_-]{20,}/g, 'sk-***[REDACTED]')
      .replace(/AIzaSy[a-zA-Z0-9_-]{20,}/g, 'AIzaSy***[REDACTED]')
      .replace(/AKIA[0-9A-Z]{16}/g, 'AKIA***[REDACTED]')
      .replace(/Bearer\s+eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/gi, 'Bearer eyJ***[REDACTED]');
  }
}
