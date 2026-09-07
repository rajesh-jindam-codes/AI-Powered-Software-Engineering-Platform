import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { HealthModule } from './modules/health/health.module';
import { InfoModule } from './modules/info/info.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { GitHubModule } from './modules/github/github.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { IntelligenceModule } from './modules/intelligence/intelligence.module';
import { AgentsModule } from './modules/agents/agents.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { TestsModule } from './modules/tests/tests.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLE_TTL', 60000),
          limit: configService.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),
    AuditModule,
    AuthModule,
    WorkspacesModule,
    GitHubModule,
    IngestionModule,
    JobsModule,
    IntelligenceModule,
    AgentsModule,
    ReviewsModule,
    TestsModule,
    CollaborationModule,
    ObservabilityModule,
    HealthModule,
    InfoModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
