import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('landing page accessibility', () => {
  test('no serious/critical WCAG 2.1 AA violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    );
    expect(
      blocking,
      blocking.map((v) => `${v.id}: ${v.nodes.length} nodes`).join('\n'),
    ).toEqual([]);
  });

  test('keyboard: first tab lands on a visible focus ring', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return getComputedStyle(el).outlineStyle;
    });
    expect(outline).not.toBe('none');
  });

  test('page is still at rest after demo completes', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(12_000);
    const h1a = await page.locator('h1').boundingBox();
    await page.waitForTimeout(3_000);
    const h1b = await page.locator('h1').boundingBox();
    expect(h1a?.width).toBe(h1b?.width);
  });

  test('slogan appears in title and h1', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Your week, handled/i);

    const h1 = page.locator('h1');
    await expect(h1).toContainText('Your week,');
    await expect(h1.locator('.sr-only')).toContainText('handled.');
  });
});
