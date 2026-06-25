import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.5'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  check(http.get(`${BASE}/`), { 'landing 200': (r) => r.status === 200 });
  check(
    http.post(
      `${BASE}/api/auth/sign-in`,
      JSON.stringify({ email: 'load@test.com', password: 'wrong' }),
      { headers: { 'Content-Type': 'application/json', Origin: BASE } }
    ),
    { 'sign-in not 500': (r) => r.status !== 500 }
  );
  sleep(1);
}
