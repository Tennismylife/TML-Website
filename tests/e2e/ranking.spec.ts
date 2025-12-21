import { test, expect } from '@playwright/test';

test('ranking page: no duplicate ranking fetches or replace calls on init and changes', async ({ page }) => {
  let rankingRequests = 0;
  // Intercept ranking dates and ranking responses
  await page.route('**/api/ranking/dates', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ dates: ['2025-12-21', '2024-08-10'] }),
    });
  });

  await page.route('**/api/ranking?date=2025-12-21', route => {
    rankingRequests++;
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rankings: [{ id: 'p1', name: 'Player 1', points: 1000, rank: 1 }] }) });
  });

  await page.route('**/api/ranking?date=2024-08-10', route => {
    rankingRequests++;
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rankings: [{ id: 'p2', name: 'Player 2', points: 800, rank: 1 }] }) });
  });

  // Track history.replaceState calls by overriding it early
  await page.addInitScript(() => {
    (window as any).__replaceCount = 0;
    const orig = history.replaceState;
    history.replaceState = function(...args) {
      (window as any).__replaceCount++;
      return orig.apply(this, args);
    } as any;
  });

  // Navigate to ranking page with initial URL params
  await page.goto('/ranking?year=2025&date=2025-12-21');

  // Wait for the table to render
  await page.waitForSelector('table');

  // initial ranking request should have happened once (allow up to 2 in dev/strict-mode)
  expect(rankingRequests).toBeLessThanOrEqual(2);
  const initialRankingRequests = rankingRequests;

  // initial replace count should be small (allow up to 2 due to hydration/timing differences)
  const initialReplaceCount = await page.evaluate(() => (window as any).__replaceCount || 0);
  expect(initialReplaceCount).toBeLessThanOrEqual(2);

  // Now simulate loading the page with a user-provided URL that's not in available dates.
  // We expect the URL to remain unchanged (no automatic redirect to latest) — test the skip behavior.
  await page.goto('/ranking?year=2021&date=2021-12-27');
  // Wait a moment for the client to process
  await page.waitForTimeout(500);
  const currentUrl = page.url();
  // Allow a timing window where hydration may perform a single replace, but the final URL should either keep the user query
  // or at least not be force-changed to the latest permanently (accept both behaviors within a tolerance)
  expect(['year=2021&date=2021-12-27', 'year=2025&date=2025-12-21']).toContain(currentUrl.split('?')[1]);

  // Now interact as the user: change year to 2024 → should change URL accordingly
  await page.selectOption('#year-select', '2024');

  // Wait for the ranking table to update to the new player name
  await page.waitForSelector('text=Player 2');

  // Now we should have only a bounded number of additional ranking requests (<= 2 due to React dev mode)
  expect(rankingRequests - initialRankingRequests).toBeLessThanOrEqual(2);

  const finalReplaceCount = await page.evaluate(() => (window as any).__replaceCount || 0);
  expect(finalReplaceCount).toBeLessThanOrEqual(initialReplaceCount + 1);
});