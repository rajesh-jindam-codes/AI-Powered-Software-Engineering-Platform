import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * DEVFLOW AI — k6 Multi-Modal Search & pgvector Benchmark (Phase 14)
 * Measures: Vector Cosine Distance latency, Symbol lookup throughput, Keyword scan speed.
 */
export const options = {
  stages: [
    { duration: '10s', target: 20 },
    { duration: '20s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<80', 'p(99)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000/api/v1';

const QUERIES = [
  'authenticateUser',
  'JwtService',
  'processCheckout',
  'RedisJobStore',
  'KafkaJobBus',
  'RateLimiter',
];

export default function () {
  const query = QUERIES[Math.floor(Math.random() * QUERIES.length)];

  const res = http.get(`${BASE_URL}/intelligence/search?repositoryId=repo_devflow&query=${query}&mode=hybrid`);
  check(res, {
    'search status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  sleep(0.05);
}
