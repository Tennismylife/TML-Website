import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test('records: single fetch after filter change', async ({ page }) => {
  await page.goto(`${BASE}/records`);

  // Click the Wins tab to ensure a concrete record is selected
  await page.click('button:has-text("Wins")');

  // Wait for initial fetch to complete
  await page.waitForResponse(r => r.url().includes('/api/records/wins') && r.status() === 200, { timeout: 10000 });

  // Collect requests after initial load
  const requests: string[] = [];
  page.on('request', req => {
    if (req.url().includes('/api/records/wins')) requests.push(req.url());
  });

  // Click a surface filter (Hard)
  await page.click('fieldset:has(legend:has-text("Surface")) button:has-text("Hard")');

  // Wait for fetch triggered by filter change
  await page.waitForResponse(r => r.url().includes('/api/records/wins') && r.status() === 200, { timeout: 10000 });

  // Allow any additional activity to settle
  await page.waitForTimeout(500);

  // Count how many requests targeting the wins endpoint occurred after interaction
  const winsRequests = requests.filter(u => u.includes('/api/records/wins'));

  // Expect at most one fetch (no double-fetch)
  expect(winsRequests.length).toBeLessThanOrEqual(1);
});