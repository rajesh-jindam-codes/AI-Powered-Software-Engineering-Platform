import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckResponse } from '@devflow/shared-types';

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(private readonly configService: ConfigService) {}

  getHealth(): HealthCheckResponse {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const environment = this.configService.get<string>('NODE_ENV', 'development');

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      version: '1.0.0',
      environment,
      services: {
        database: { status: 'up', latencyMs: 1 },
        redis: { status: 'up', latencyMs: 1 },
        kafka: { status: 'up' },
      },
    };
  }

  getLiveness(): { status: 'ok'; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  getReadiness(): { status: 'ready'; timestamp: string } {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }
}
