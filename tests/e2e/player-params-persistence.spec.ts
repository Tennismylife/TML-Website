import { test, expect } from '@playwright/test';

const stubMatches = [{
  id: '1',
  year: 2021,
  tourney_id: '520',
  tourney_name: 'Tourney 520',
  status: true,
  winner_id: 'roger-federer',
  loser_id: 'pX',
  tourney_date: '2021-01-01'
}];

test('players page: filters from URL are visible and persist after reload', async ({ page }) => {
  let matchesRequestsWithParams = 0;

  // Track history.replaceState calls
  await page.addInitScript(() => {
    (window as any).__replaceCount = 0;
    const orig = history.replaceState;
    history.replaceState = function(...args) {
      (window as any).__replaceCount++;
      return orig.apply(this, args);
    } as any;
  });

  // Intercept allmatches endpoint and return stub
  await page.route('**/api/players/allmatches**', route => {
    const url = route.request().url();
    if (url.includes('year=2021') && url.includes('tourney=520') && url.includes('vsRank=Top100')) matchesRequestsWithParams++;
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(stubMatches),
    });
  });

  // Navigate to player page with filters in query (path-based tab)
  await page.goto('/players/roger-federer/matches?year=2021&tourney=520&vsRank=Top100');

  // Wait for filter inputs to appear and be checked
  await page.waitForSelector('input[name="Season"][value="2021"]');
  await page.waitForSelector('input[name="Tourney"][value="520"]');
  await page.waitForSelector('input[name="vs Rank"][value="Top100"]');

  expect(await page.isChecked('input[name="Season"][value="2021"]')).toBeTruthy();
  expect(await page.isChecked('input[name="Tourney"][value="520"]')).toBeTruthy();
  expect(await page.isChecked('input[name="vs Rank"][value="Top100"]')).toBeTruthy();

  // Ensure the allmatches endpoint was requested with the params at least once
  expect(matchesRequestsWithParams).toBeGreaterThan(0);

  // Reload the page 5 times consecutively and verify filters persist after each reload
  for (let i = 0; i < 5; i++) {
    await page.reload();
    // wait for the client to re-hydrate and for filters to be applied
    await page.waitForSelector('input[name="Season"][value="2021"]');
    expect(await page.isChecked('input[name="Season"][value="2021"]')).toBeTruthy();
    expect(await page.isChecked('input[name="Tourney"][value="520"]')).toBeTruthy();
    expect(await page.isChecked('input[name="vs Rank"][value="Top100"]')).toBeTruthy();
  }

  // Final URL should still contain the original params
  const currentUrl = page.url();
  expect(currentUrl.includes('year=2021')).toBeTruthy();
  expect(currentUrl.includes('tourney=520')).toBeTruthy();
  expect(currentUrl.includes('vsRank=Top100')).toBeTruthy();
});