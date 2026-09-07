import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * DEVFLOW AI — k6 REST API Load & Concurrency Benchmark (Phase 14)
 * Measures: Requests per second (RPS), P50, P95, P99 Latency, and Error Rate.
 */
export const options = {
  stages: [
    { duration: '15s', target: 25 }, // Ramp up to 25 VUs
    { duration: '30s', target: 50 }, // Sustained 50 VUs
    { duration: '15s', target: 100 }, // Peak 100 VUs
    { duration: '10s', target: 0 }, // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<150', 'p(99)<300'], // 95% of requests < 150ms
    http_req_failed: ['rate<0.01'], // < 1% error rate
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000/api/v1';

export default function () {
  // 1. Health check endpoint
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
  });

  // 2. Platform info
  const infoRes = http.get(`${BASE_URL}/info`);
  check(infoRes, {
    'info status is 200': (r) => r.status === 200,
  });

  // 3. Prometheus metrics endpoint
  const metricsRes = http.get('http://localhost:4000/metrics');
  check(metricsRes, {
    'metrics status is 200': (r) => r.status === 200,
  });

  sleep(0.1);
}
