import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function prepareAnimatedPage(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForLoadState('domcontentloaded');
  // Let hero entrance animations finish before scanning.
  await page.waitForTimeout(2500);
  await page.evaluate(async () => {
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 0);

    for (let y = 0; y <= maxScroll; y += Math.max(window.innerHeight / 2, 300)) {
      window.scrollTo(0, y);
      await delay(250);
    }

    window.scrollTo(0, 0);
    await delay(800);
  });
  await page.waitForTimeout(500);
}

test.describe('Accessibility', () => {
  test('landing page has no critical axe violations', async ({ page }) => {
    await page.goto('/');
    await prepareAnimatedPage(page);

    const results = await new AxeBuilder({ page })
      .exclude('[aria-hidden="true"]')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const critical = results.violations.filter(
      (violation) => violation.impact === 'critical'
    );
    expect(critical).toEqual([]);
  });

  test('login page has no critical axe violations', async ({ page }) => {
    await page.goto('/login');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const critical = results.violations.filter(
      (violation) => violation.impact === 'critical'
    );
    expect(critical).toEqual([]);
  });

  test('privacy policy page has no critical axe violations', async ({ page }) => {
    await page.goto('/privacy');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const critical = results.violations.filter(
      (violation) => violation.impact === 'critical'
    );
    expect(critical).toEqual([]);
  });
});
