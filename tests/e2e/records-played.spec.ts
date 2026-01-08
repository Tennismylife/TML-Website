import { test, expect } from '@playwright/test';

test.describe('Records - Played', () => {
  test('API returns players JSON', async ({ request }) => {
    const res = await request.get('/api/records/played');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.players)).toBeTruthy();
    expect(body.players.length).toBeGreaterThan(0);
  });

  test('SSR page contains a known player name', async ({ page }) => {
    const res = await page.goto('/records/played');
    expect(res).not.toBeNull();
    // check page content contains Rafael Nadal as an example of server-rendered content
    await expect(page.locator('text=Rafael Nadal')).toBeVisible();
  });
});
