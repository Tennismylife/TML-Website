import { test, expect } from '@playwright/test';

test('Initial load fetches exactly 10 matches and "Show All matches" fetches full list', async ({ page }) => {
  const url = '/players/frances-tiafoe/matches';

  // Collect all /api/players/allmatches responses
  const matchesResponses: any[] = [];
  page.on('response', (resp) => {
    if (resp.url().includes('/api/players/allmatches')) matchesResponses.push(resp);
  });

  await page.goto(url, { waitUntil: 'networkidle' });

  // Locator for visible rows (used in both branches)
  const rows = page.locator('table:visible tbody tr');

  // Try to capture an initial client-side API response if any (short timeout).
  let initialResp: any = null;
  try {
    initialResp = await page.waitForResponse(r => r.url().includes('/api/players/allmatches'), { timeout: 2000 });
  } catch (e) {
    // No client-side initial request observed (likely SSR provided the initial slice)
  }

  if (initialResp) {
    expect(initialResp.ok()).toBeTruthy();
    const initialJson = await initialResp.json();
    expect(Array.isArray(initialJson)).toBeTruthy();
    // Assert the initial fetch returned exactly 10 matches
    expect(initialJson.length).toBe(10);

    // Ensure there was no full (unlimited) fetch before clicking Show All
    await page.waitForTimeout(300);
    for (const r of matchesResponses) {
      if (r === initialResp) continue;
      const j = await r.json();
      expect(Array.isArray(j)).toBeTruthy();
      expect(j.length).toBeLessThanOrEqual(10);
    }
  } else {
    // No client-side request: verify server-rendered table shows 10 rows and no client fetches happened
    const rows = page.locator('table:visible tbody tr');
    await expect(rows).toHaveCount(10);
    // ensure no client-side /api/players/allmatches calls happened before Show All
    expect(matchesResponses.length).toBe(0);
  }

  // Click Show All and wait for the subsequent full-list response
  const [fullResp] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/players/allmatches') && r !== initialResp),
    page.click('text=Show All matches')
  ]);

  expect(fullResp.ok()).toBeTruthy();
  const fullJson = await fullResp.json();
  expect(Array.isArray(fullJson)).toBeTruthy();
  expect(fullJson.length).toBeGreaterThan(10);

  // Wait until the table shows the full count
  await expect(rows).toHaveCount(fullJson.length);
});