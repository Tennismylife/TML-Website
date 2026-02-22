import { test, expect } from '@playwright/test';

const PLAYER_URL = '/players/sebastian-korda/matches';

// Normalise a date string (any format) to YYYY-MM-DD for comparison
function normalizeDate(d: string): string {
  const iso = d.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const dmy = d.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return d;
}

test.describe('Sebastian Korda – 10 latest matches on first visit', () => {

  test('SSR: 10 rows present in HTML before JS executes', async ({ page }) => {
    await page.route('**/*.js', route => route.abort());
    await page.goto(PLAYER_URL, { waitUntil: 'domcontentloaded' });

    const rows = page.locator('#server-all-matches table tbody tr');
    await expect(rows).toHaveCount(10, { timeout: 5000 });
    await expect(rows.first().locator('td').first()).not.toBeEmpty();
  });

  test('SSR output matches fresh API slice', async ({ page }) => {
    // fetch API directly with no-store to bypass any caches
    const apiResp = await page.request.get('/api/players/allmatches?id=K0AH&limit=10', { cache: 'no-store' });
    expect(apiResp.ok()).toBe(true);
    const apiMatches: any[] = await apiResp.json();
    const apiDates = apiMatches.map(m => String(m.tourney_date ?? '').slice(0,10));

    await page.route('**/*.js', route => route.abort());
    await page.goto(PLAYER_URL, { waitUntil: 'domcontentloaded' });
    const rows = page.locator('#server-all-matches table tbody tr');
    const ssrDates = await rows.locator('td:first-child').allTextContents();
    const norm = (d: string) => normalizeDate(d);
    const ssrNorm = ssrDates.map(norm);
    const apiNorm = apiDates.map(norm);

    expect(ssrNorm).toEqual(apiNorm);
  });

  test('Interactive: 10 rows shown in descending date order after hydration', async ({ page }) => {
    await page.goto(PLAYER_URL, { waitUntil: 'networkidle' });

    const rows = page.locator('table:visible tbody tr');
    await expect(rows).toHaveCount(10, { timeout: 10000 });
    await expect(page.locator('button:has-text("Show All matches")')).toBeVisible({ timeout: 5000 });

    const dateCells = rows.locator('td:first-child');
    const pageDates = (await dateCells.allTextContents()).map(normalizeDate);
    console.log('Dates shown (normalized):', pageDates);

    // Rows must be in non-ascending (desc) date order — latest match first
    for (let i = 1; i < pageDates.length; i++) {
      expect(
        pageDates[i] <= pageDates[i - 1],
        `Row ${i} date "${pageDates[i]}" must not be newer than row ${i - 1} "${pageDates[i - 1]}"`
      ).toBeTruthy();
    }
  });

  test('Page shows same 10 latest matches as the allmatches API (via intercepted request)', async ({ page }) => {
    let capturedApiUrl: string | null = null;
    let apiMatches: any[] | null = null;

    // Intercept the allmatches call the page actually makes (uses real player.id)
    page.on('response', async (resp) => {
      const u = resp.url();
      if (u.includes('/api/players/allmatches') && u.includes('limit=10')) {
        capturedApiUrl = u;
        try { apiMatches = await resp.json(); } catch (_) {}
      }
    });

    await page.goto(PLAYER_URL, { waitUntil: 'networkidle' });

    const rows = page.locator('table:visible tbody tr');
    await expect(rows).toHaveCount(10, { timeout: 10000 });

    if (!capturedApiUrl || !apiMatches) {
      // Fully SSR-rendered: no client-side request needed
      console.log('Page fully SSR-rendered — no client API request intercepted.');
      // Still verify descending order
      const pageDates = (await rows.locator('td:first-child').allTextContents()).map(normalizeDate);
      for (let i = 1; i < pageDates.length; i++) {
        expect(pageDates[i] <= pageDates[i - 1]).toBeTruthy();
      }
      return;
    }

    console.log('API url used by page:', capturedApiUrl);

    // API must return exactly 10 matches in descending date order
    expect(apiMatches!.length).toBe(10);
    const apiDates = apiMatches!.map((m: any) => String(m.tourney_date ?? '').slice(0, 10));
    console.log('API dates:', apiDates);

    for (let i = 1; i < apiDates.length; i++) {
      expect(
        apiDates[i] <= apiDates[i - 1],
        `API row ${i} date "${apiDates[i]}" must not be newer than row ${i - 1} "${apiDates[i - 1]}"`
      ).toBeTruthy();
    }

    // The newest API date must also be the first date on the page
    const pageDates = (await rows.locator('td:first-child').allTextContents()).map(normalizeDate);
    console.log('Page dates:', pageDates);
    expect(
      pageDates[0] === apiDates[0],
      `First row on page "${pageDates[0]}" must match first API date "${apiDates[0]}"`
    ).toBeTruthy();
  });

  test('Show All matches loads the full list (>10 rows)', async ({ page }) => {
    await page.goto(PLAYER_URL, { waitUntil: 'networkidle' });
    const rows = page.locator('table:visible tbody tr');
    await expect(rows).toHaveCount(10, { timeout: 10000 });

    const [fullResp] = await Promise.all([
      page.waitForResponse(
        r => r.url().includes('/api/players/allmatches') && !r.url().includes('limit=10'),
        { timeout: 20000 }
      ),
      page.click('button:has-text("Show All matches")'),
    ]);

    expect(fullResp.ok()).toBe(true);
    const fullData = await fullResp.json();
    expect(Array.isArray(fullData)).toBe(true);
    expect(fullData.length).toBeGreaterThan(10);
    await expect(rows).toHaveCount(fullData.length, { timeout: 15000 });
  });

});
