import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default('api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // JWT Authentication
  JWT_SECRET: z.string().default('devflow-ultra-secure-jwt-secret-key-phase2-production-2026'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().default('devflow-ultra-secure-jwt-refresh-secret-key-phase2-2026'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Rate Limiting (Throttler)
  THROTTLE_TTL: z.coerce.number().default(60000), // 60s
  THROTTLE_LIMIT: z.coerce.number().default(100), // 100 requests per minute
  AUTH_THROTTLE_LIMIT: z.coerce.number().default(10), // 10 requests per minute on auth endpoints

  // Database
  DATABASE_HOST: z.string().default('localhost'),
  DATABASE_PORT: z.coerce.number().default(5432),
  DATABASE_USER: z.string().default('devflow'),
  DATABASE_PASSWORD: z.string().default('devflow_password'),
  DATABASE_NAME: z.string().default('devflow_db'),
  DATABASE_SSL: z.coerce.boolean().default(false),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // Kafka
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('devflow-api'),
  KAFKA_GROUP_ID: z.string().default('devflow-core-group'),

  // Python AI Service
  AI_SERVICE_URL: z.string().default('http://localhost:8000'),

  // GitHub Integration & OAuth
  GITHUB_CLIENT_ID: z.string().default('devflow_gh_client_id_dev'),
  GITHUB_CLIENT_SECRET: z.string().default('devflow_gh_client_secret_dev'),
  GITHUB_WEBHOOK_SECRET: z.string().default('devflow-gh-webhook-secret-2026'),
  GITHUB_OAUTH_REDIRECT_URI: z
    .string()
    .default('http://localhost:3000/api/v1/github/callback'),
  GITHUB_TOKEN_ENCRYPTION_KEY: z
    .string()
    .default('devflow-aes-256-gcm-master-encryption-key-2026!'),
});

export type AppConfig = z.infer<typeof configSchema>;
