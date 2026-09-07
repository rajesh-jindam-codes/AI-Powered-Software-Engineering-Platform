import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { HealthService } from './health.service';
import { HealthCheckResponse } from '@devflow/shared-types';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getHealth(): HealthCheckResponse {
    return this.healthService.getHealth();
  }

  @Get('liveness')
  @HttpCode(HttpStatus.OK)
  getLiveness(): { status: 'ok'; timestamp: string } {
    return this.healthService.getLiveness();
  }

  @Get('readiness')
  @HttpCode(HttpStatus.OK)
  getReadiness(): { status: 'ready'; timestamp: string } {
    return this.healthService.getReadiness();
  }
}
