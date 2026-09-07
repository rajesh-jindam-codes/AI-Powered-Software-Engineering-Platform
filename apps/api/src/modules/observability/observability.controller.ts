import {
  Controller,
  Get,
  Param,
  Query,
  Header,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { DistributedTracingService } from './distributed-tracing.service';
import {
  SystemTelemetryMetrics,
  DistributedTrace,
  SecurityComplianceReport,
} from '@devflow/shared-types';

@Controller('observability')
export class ObservabilityController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly tracingService: DistributedTracingService,
  ) {}

  @Get('prometheus')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  getPrometheusMetrics(): string {
    return this.metricsService.getPrometheusMetricsText();
  }

  @Get('metrics')
  getMetrics(): SystemTelemetryMetrics {
    return this.metricsService.getSystemMetrics();
  }

  @Get('traces')
  listTraces(
    @Query('status') status?: 'OK' | 'ERROR',
    @Query('limit') limit?: number,
  ): DistributedTrace[] {
    return this.tracingService.listTraces({ status, limit: limit ? Number(limit) : 20 });
  }

  @Get('traces/:id')
  getTraceById(@Param('id') id: string): DistributedTrace {
    return this.tracingService.getTraceById(id);
  }

  @Get('security-report')
  getSecurityReport(): SecurityComplianceReport {
    return this.metricsService.getSecurityComplianceReport();
  }
}

/**
 * Public standard Prometheus scraper controller mounted at root /metrics
 */
@Controller('metrics')
export class PrometheusMetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  getPrometheus(): string {
    return this.metricsService.getPrometheusMetricsText();
  }
}
