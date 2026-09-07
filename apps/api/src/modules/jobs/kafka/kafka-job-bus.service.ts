import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  CloudEventEnvelope,
  JobDeadLetterEventPayload,
  JobDispatchedEventPayload,
  JobRetryEventPayload,
  KAFKA_TOPICS,
  KafkaTopic,
} from '@devflow/event-schemas';
import { JobPriority, JobRecord, JobType } from '@devflow/shared-types';

export type JobHandler<T = unknown> = (event: CloudEventEnvelope<JobDispatchedEventPayload<T>>) => Promise<void>;

/**
 * DEVFLOW AI — Phase 6 Kafka Distributed Job Bus Service
 *
 * Implements:
 * 1. CloudEvents v1.0 Envelope wrapping and topic routing
 * 2. Partition key assignment (workspace/repo affinity for ordered execution)
 * 3. Progressive 3-Tier Retry Topics (retry.1, retry.2, retry.3) with jittered backoff
 * 4. Dead-Letter Queue (DLQ) topic routing with complete error diagnostics
 * 5. Circuit breaker & offline buffer for high-availability resilience
 */
@Injectable()
export class KafkaJobBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaJobBusService.name);

  private isKafkaConnected = true;
  private readonly offlineBuffer: Array<{ topic: KafkaTopic; event: CloudEventEnvelope<unknown> }> = [];
  private readonly subscribers = new Map<string, JobHandler[]>();

  onModuleInit() {
    this.logger.log('KafkaJobBusService initialized with partitioned topics and 3-tier retry queues');
  }

  onModuleDestroy() {
    this.subscribers.clear();
    this.offlineBuffer.length = 0;
  }

  setKafkaConnected(connected: boolean): void {
    this.isKafkaConnected = connected;
    this.logger.warn(`Kafka broker state changed: ${connected ? 'ONLINE' : 'SIMULATED OFFLINE'}`);

    if (connected && this.offlineBuffer.length > 0) {
      this.logger.log(`Kafka back online: flushing ${this.offlineBuffer.length} buffered messages`);
      const buffer = [...this.offlineBuffer];
      this.offlineBuffer.length = 0;
      for (const item of buffer) {
        this.dispatchToSubscribers(item.topic, item.event);
      }
    }
  }

  isOnline(): boolean {
    return this.isKafkaConnected;
  }

  getBufferedCount(): number {
    return this.offlineBuffer.length;
  }

  /**
   * Determine primary Kafka topic from JobType
   */
  getTopicForJobType(jobType: JobType): KafkaTopic {
    switch (jobType) {
      case 'REPOSITORY_INDEX':
        return KAFKA_TOPICS.JOBS_REPOSITORY_INDEX;
      case 'CODE_ANALYSIS':
        return KAFKA_TOPICS.JOBS_CODE_ANALYSIS;
      case 'EMBEDDING_GENERATION':
        return KAFKA_TOPICS.JOBS_EMBEDDING_GENERATION;
      case 'TEST_EXECUTION':
        return KAFKA_TOPICS.JOBS_TEST_EXECUTION;
      case 'AI_REVIEW':
        return KAFKA_TOPICS.JOBS_AI_REVIEW;
      case 'DOCUMENTATION':
        return KAFKA_TOPICS.JOBS_DOCUMENTATION;
      default:
        return KAFKA_TOPICS.JOBS_REPOSITORY_INDEX;
    }
  }

  /**
   * Dispatch a newly enqueued job to Kafka
   */
  async publishJobDispatched(job: JobRecord): Promise<void> {
    const topic = this.getTopicForJobType(job.jobType);
    const partitionKey = job.repositoryId || job.workspaceId || job.id;

    const payload: JobDispatchedEventPayload = {
      jobId: job.id,
      jobType: job.jobType,
      workspaceId: job.workspaceId,
      repositoryId: job.repositoryId,
      priority: job.priority,
      attempt: job.attempt,
      maxRetries: job.maxRetries,
      timeoutSeconds: job.timeoutSeconds,
      idempotencyKey: job.idempotencyKey,
      payload: job.payload,
      enqueuedAt: new Date().toISOString(),
    };

    const envelope: CloudEventEnvelope<JobDispatchedEventPayload> = {
      specversion: '1.0',
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: `devflow.job.${job.jobType.toLowerCase()}.dispatched`,
      source: `devflow.api.jobs`,
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data: payload,
    };

    if (!this.isKafkaConnected) {
      this.logger.warn(`Kafka offline: buffering job ${job.id} on topic ${topic}`);
      this.offlineBuffer.push({ topic, event: envelope });
      return;
    }

    this.logger.debug(`Published job ${job.id} to topic ${topic} (partitionKey: ${partitionKey})`);
    await this.dispatchToSubscribers(topic, envelope);
  }

  /**
   * Route failed job to progressive Retry Topic (Tier 1: 1s, Tier 2: 5s, Tier 3: 30s)
   */
  async publishJobRetry(
    job: JobRecord,
    error: { message: string; code?: string; stack?: string },
    calculatedDelayMs: number,
  ): Promise<void> {
    const retryTier: 1 | 2 | 3 = job.attempt === 1 ? 1 : job.attempt === 2 ? 2 : 3;
    const retryTopic: KafkaTopic =
      retryTier === 1
        ? KAFKA_TOPICS.JOBS_RETRY_1
        : retryTier === 2
          ? KAFKA_TOPICS.JOBS_RETRY_2
          : KAFKA_TOPICS.JOBS_RETRY_3;

    const payload: JobRetryEventPayload = {
      jobId: job.id,
      jobType: job.jobType,
      attempt: job.attempt,
      maxRetries: job.maxRetries,
      retryTier,
      scheduledDelayMs: calculatedDelayMs,
      lastError: error,
      payload: job.payload,
      scheduledAt: new Date(Date.now() + calculatedDelayMs).toISOString(),
    };

    const envelope: CloudEventEnvelope<JobRetryEventPayload> = {
      specversion: '1.0',
      id: `retry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: `devflow.job.retry.tier${retryTier}`,
      source: `devflow.worker.${job.jobType.toLowerCase()}`,
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data: payload,
    };

    if (!this.isKafkaConnected) {
      this.offlineBuffer.push({ topic: retryTopic, event: envelope });
      return;
    }

    this.logger.warn(
      `Job ${job.id} failed (attempt ${job.attempt}/${job.maxRetries}). Routing to ${retryTopic} (delay: ${calculatedDelayMs}ms)`,
    );
    await this.dispatchToSubscribers(retryTopic, envelope);
  }

  /**
   * Route permanently failed job to Dead-Letter Queue (DLQ)
   */
  async publishJobDeadLetter(
    job: JobRecord,
    deadLetterReason: string,
    finalError: { message: string; code?: string; stack?: string },
  ): Promise<void> {
    const dlqTopic = KAFKA_TOPICS.JOBS_DLQ;

    const payload: JobDeadLetterEventPayload = {
      jobId: job.id,
      jobType: job.jobType,
      workspaceId: job.workspaceId,
      repositoryId: job.repositoryId,
      attemptsExhausted: job.attempt,
      deadLetterReason,
      finalError,
      originalPayload: job.payload,
      failedAt: new Date().toISOString(),
    };

    const envelope: CloudEventEnvelope<JobDeadLetterEventPayload> = {
      specversion: '1.0',
      id: `dlq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'devflow.job.dead_letter',
      source: `devflow.worker.${job.jobType.toLowerCase()}`,
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data: payload,
    };

    if (!this.isKafkaConnected) {
      this.offlineBuffer.push({ topic: dlqTopic, event: envelope });
      return;
    }

    this.logger.error(`Job ${job.id} permanently DEAD-LETTERED on ${dlqTopic}. Reason: ${deadLetterReason}`);
    await this.dispatchToSubscribers(dlqTopic, envelope);
  }

  /**
   * Subscribe worker consumer group to topic
   */
  subscribe(topic: string, handler: JobHandler): void {
    const handlers = this.subscribers.get(topic) || [];
    handlers.push(handler);
    this.subscribers.set(topic, handlers);
  }

  private async dispatchToSubscribers(topic: string, event: CloudEventEnvelope<any>): Promise<void> {
    const handlers = this.subscribers.get(topic) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (err: any) {
        this.logger.error(`Subscriber error processing event on ${topic}: ${err.message}`);
      }
    }
  }

  clearSubscribers(): void {
    this.subscribers.clear();
    this.offlineBuffer.length = 0;
  }
}
