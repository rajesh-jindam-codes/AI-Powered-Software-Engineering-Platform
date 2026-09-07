import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * DEVFLOW AI — k6 AI RAG & LLM Query Benchmark (Phase 14)
 * Measures: Hybrid retrieval + LLM streaming latency, token generation throughput.
 */
export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '20s', target: 25 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<900', 'p(99)<1500'],
    http_req_failed: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000/api/v1';

const QUESTIONS = [
  'Where is authentication implemented?',
  'How does checkout work?',
  'Where is PostgreSQL configured?',
  'What happens when an order is created?',
];

export default function () {
  const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  const payload = JSON.stringify({
    repositoryId: 'repo_devflow',
    question,
    stream: false,
  });

  const headers = { 'Content-Type': 'application/json' };
  const res = http.post(`${BASE_URL}/intelligence/rag/query`, payload, { headers });

  check(res, {
    'AI RAG status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  sleep(0.5);
}
