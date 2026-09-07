import { Module, Global } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { DistributedTracingService } from './distributed-tracing.service';
import {
  ObservabilityController,
  PrometheusMetricsController,
} from './observability.controller';
import { SsrfProtectionService } from '../../common/security/ssrf-protection.service';
import { SecretSanitizerInterceptor } from '../../common/interceptors/secret-sanitizer.interceptor';

@Global()
@Module({
  controllers: [ObservabilityController, PrometheusMetricsController],
  providers: [
    MetricsService,
    DistributedTracingService,
    SsrfProtectionService,
    SecretSanitizerInterceptor,
  ],
  exports: [
    MetricsService,
    DistributedTracingService,
    SsrfProtectionService,
    SecretSanitizerInterceptor,
  ],
})
export class ObservabilityModule {}
