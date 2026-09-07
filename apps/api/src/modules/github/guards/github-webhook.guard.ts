import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Request } from 'express';

@Injectable()
export class GitHubWebhookGuard implements CanActivate {
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.webhookSecret = this.configService.get<string>(
      'GITHUB_WEBHOOK_SECRET',
      'devflow-gh-webhook-secret-2026',
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const signatureHeader = request.headers['x-hub-signature-256'] as string;

    if (!signatureHeader) {
      throw new UnauthorizedException('Missing X-Hub-Signature-256 header');
    }

    if (!signatureHeader.startsWith('sha256=')) {
      throw new UnauthorizedException('Invalid signature format, expected sha256=...');
    }

    const rawPayload = typeof request.body === 'string'
      ? request.body
      : JSON.stringify(request.body);

    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    const calculatedSignature = `sha256=${hmac.update(rawPayload).digest('hex')}`;

    const expectedBuffer = Buffer.from(calculatedSignature, 'utf8');
    const actualBuffer = Buffer.from(signatureHeader, 'utf8');

    if (
      expectedBuffer.length !== actualBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
    ) {
      throw new UnauthorizedException('Invalid GitHub webhook HMAC-SHA256 signature');
    }

    return true;
  }
}
