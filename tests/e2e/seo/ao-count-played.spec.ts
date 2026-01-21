import { test, expect } from '@playwright/test';

test.describe('SEO - Australian Open Count Played', () => {
  test('has correct canonical URL', async ({ page }) => {
    await page.goto('/tournaments/australian-open/records/count/played');
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', 'https://stats.tennismylife.org/tournaments/australian-open/records/count/played');
  });

  test('has correct JSON-LD types', async ({ page }) => {
    await page.goto('/tournaments/australian-open/records/count/played');
    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();
    expect(count).toBeGreaterThanOrEqual(3); // At least WebPage, FAQPage, BreadcrumbList

    const types = [];
    for (let i = 0; i < count; i++) {
      const scriptContent = await scripts.nth(i).textContent();
      const json = JSON.parse(scriptContent || '{}');
      types.push(json['@type']);
    }

    expect(types).toContain('WebPage');
    expect(types).toContain('FAQPage');
    expect(types).toContain('BreadcrumbList');
  });
});