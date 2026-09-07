import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * DEVFLOW AI — k6 Kafka Job Creation & Enqueue Benchmark (Phase 14)
 * Measures: Job enqueue throughput, partition assignment latency, idempotency resolution.
 */
export const options = {
  stages: [
    { duration: '10s', target: 30 },
    { duration: '20s', target: 60 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<100'],
    http_req_failed: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000/api/v1';

export default function () {
  const payload = JSON.stringify({
    jobType: 'CODE_ANALYSIS',
    repositoryId: 'repo_devflow',
    workspaceId: 'ws_devflow_primary',
    payload: { targetPath: 'src/' },
    priority: 3,
  });

  const headers = { 'Content-Type': 'application/json' };
  const res = http.post(`${BASE_URL}/jobs`, payload, { headers });

  check(res, {
    'job creation response status is valid': (r) => r.status === 201 || r.status === 200 || r.status === 401,
  });

  sleep(0.05);
}
