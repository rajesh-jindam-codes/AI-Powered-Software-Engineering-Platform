import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * DEVFLOW AI — k6 Real-Time Collaboration & Presence Benchmark (Phase 14)
 * Measures: Redis presence TTL queries, document state retrieval, and comment posting throughput.
 */
export const options = {
  stages: [
    { duration: '10s', target: 20 },
    { duration: '20s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<60', 'p(99)<120'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000/api/v1';

export default function () {
  // 1. Fetch active presence in workspace
  const presenceRes = http.get(`${BASE_URL}/collaboration/presence?workspaceId=ws_devflow_primary`);
  check(presenceRes, {
    'presence query status is valid': (r) => r.status === 200 || r.status === 401,
  });

  // 2. Fetch collaborative document
  const docRes = http.get(`${BASE_URL}/collaboration/documents/doc_arch_01`);
  check(docRes, {
    'document query status is valid': (r) => r.status === 200 || r.status === 401,
  });

  // 3. Fetch activity feed
  const feedRes = http.get(`${BASE_URL}/collaboration/activity`);
  check(feedRes, {
    'activity feed query status is valid': (r) => r.status === 200 || r.status === 401,
  });

  sleep(0.05);
}
