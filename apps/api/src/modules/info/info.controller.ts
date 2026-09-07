import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiInfoResponse } from '@devflow/shared-types';

@Controller('info')
export class InfoController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getInfo(): ApiInfoResponse {
    const environment = this.configService.get<string>('NODE_ENV', 'development');
    const apiPrefix = this.configService.get<string>('API_PREFIX', 'api/v1');

    return {
      service: 'DEVFLOW AI Core API',
      version: '1.0.0',
      environment,
      apiVersion: apiPrefix,
      timestamp: new Date().toISOString(),
    };
  }
}
