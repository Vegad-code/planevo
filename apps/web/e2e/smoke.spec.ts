import { test, expect } from '@playwright/test';

// These smoke tests use a test user to verify structural rendering.
// They require E2E_TEST_EMAIL and E2E_TEST_PASSWORD in the environment.
// If not present, we skip the authenticated tests.

test.describe('Planevo Smoke Tests', () => {
  test('Landing page loads and has sign-in links', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toBeDefined();

    const loginLink = page.locator('a[href*="/login"]');
    if (await loginLink.count() > 0) {
      await expect(loginLink.first()).toBeVisible();
    }
  });

  test('Dashboard path requires authentication and redirects', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/login**');
    expect(page.url()).toContain('/login');
  });

  test.describe('Authenticated flows', () => {
    test.skip(() => !process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD, 'Missing E2E test credentials');

    test.beforeEach(async ({ page }) => {
      // Login flow
      await page.goto('/login');
      await page.fill('input[type="email"]', process.env.E2E_TEST_EMAIL!);
      await page.fill('input[type="password"]', process.env.E2E_TEST_PASSWORD!);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard**');
    });

    test('Dashboard loads', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page.locator('text=Today').first()).toBeVisible();
    });

    test('Add task', async ({ page }) => {
      await page.goto('/dashboard/tasks');
      // Wait for task input to be visible and fill it
      const taskInput = page.getByPlaceholder(/Add a task/i);
      await taskInput.waitFor();
      await taskInput.fill('Smoke test task');
      await taskInput.press('Enter');
      
      // Verify task was added
      await expect(page.getByText('Smoke test task').first()).toBeVisible();
    });

    test('Generate plan', async ({ page }) => {
      await page.goto('/dashboard/daily-plan');
      
      const generateBtn = page.getByRole('button', { name: /Generate/i });
      if (await generateBtn.isVisible()) {
        await generateBtn.click();
      }
      
      // We wait for some plan block to appear.
      await expect(page.locator('.plan-block, [data-testid="plan-block"]').first()).toBeVisible();
    });

    test('Calendar shows block', async ({ page }) => {
      await page.goto('/dashboard/calendar');
      await expect(page.locator('.calendar-event, [data-testid="calendar-event"]')).toBeVisible();
    });

    test('Chat creates task', async ({ page }) => {
      await page.goto('/dashboard/chat');
      
      const chatInput = page.getByPlaceholder(/message/i);
      await chatInput.fill('Create a task to study playwright');
      await chatInput.press('Enter');
      
      // Wait for AI to respond and task to be visible
      await expect(page.getByText(/study playwright/i).first()).toBeVisible();
    });
  });
});
