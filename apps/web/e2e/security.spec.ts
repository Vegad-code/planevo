import { test, expect } from '@playwright/test';

test.describe('Security regression', () => {
  test('Unauthenticated /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/login**');
    expect(page.url()).toContain('/login');
  });

  test('Cross-origin POST to protected API returns 403', async ({ request }) => {
    const response = await request.post('/api/stripe/portal', {
      headers: {
        Origin: 'https://evil.example',
        'Content-Type': 'application/json',
      },
      data: {},
    });
    expect(response.status()).toBe(403);
  });

  test('Rate limit sign-in after repeated invalid attempts', async ({ request }) => {
    const attempts = 12;
    let saw429 = false;

    for (let i = 0; i < attempts; i += 1) {
      const response = await request.post('/api/auth/sign-in', {
        headers: {
          Origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
        },
        data: {
          email: `rate-limit-test-${i}@example.com`,
          password: 'wrong-password',
        },
      });
      if (response.status() === 429) {
        saw429 = true;
        break;
      }
    }

    expect(saw429).toBe(true);
  });
});

test.describe('IDOR protection', () => {
  test.skip(
    () => !process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD,
    'Missing E2E test credentials'
  );

  test('Cannot fetch another user conversation by ID', async ({ browser, request }) => {
    const otherConversationId = process.env.E2E_OTHER_USER_CONVERSATION_ID;
    test.skip(!otherConversationId, 'Set E2E_OTHER_USER_CONVERSATION_ID for IDOR test');

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.E2E_TEST_EMAIL!);
    await page.fill('input[type="password"]', process.env.E2E_TEST_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');

    const cookies = await context.cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const response = await request.get(`/api/ai/conversations/${otherConversationId}`, {
      headers: {
        Cookie: cookieHeader,
        Origin: 'http://localhost:3000',
      },
    });

    expect([401, 403, 404]).toContain(response.status());
    await context.close();
  });
});
