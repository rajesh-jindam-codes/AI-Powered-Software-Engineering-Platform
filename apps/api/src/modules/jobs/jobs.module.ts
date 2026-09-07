import { Module } from '@nestjs/common';
import { RedisJobStoreService } from './redis/redis-job-store.service';
import { KafkaJobBusService } from './kafka/kafka-job-bus.service';
import { JobsRepository } from './jobs.repository';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { IndexWorker } from './workers/index.worker';
import { AnalysisWorker } from './workers/analysis.worker';
import { EmbeddingWorker } from './workers/embedding.worker';
import { TestWorker } from './workers/test.worker';
import { ReviewWorker } from './workers/review.worker';
import { DocumentationWorker } from './workers/documentation.worker';

@Module({
  controllers: [JobsController],
  providers: [
    RedisJobStoreService,
    KafkaJobBusService,
    JobsRepository,
    IndexWorker,
    AnalysisWorker,
    EmbeddingWorker,
    TestWorker,
    ReviewWorker,
    DocumentationWorker,
    JobsService,
  ],
  exports: [JobsService, RedisJobStoreService, KafkaJobBusService, JobsRepository],
})
export class JobsModule {}
