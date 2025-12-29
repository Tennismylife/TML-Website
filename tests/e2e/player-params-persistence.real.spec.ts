import { test, expect } from '@playwright/test';

// This test runs against the real dev server (no network interception) and collects console logs
test('players page (real server): filters persist after multiple reloads and inspect console', async ({ page, baseURL }) => {
  const targetPath = '/players/roger-federer?tab=matches&year=2021&tourney=520&vsRank=Top100';
  const fullUrl = (baseURL || '') + targetPath;

  const consoleMessages: string[] = [];
  page.on('console', msg => {
    try {
      const text = msg.text();
      consoleMessages.push(text);
    } catch (e) {}
  });

  await page.goto(fullUrl);

  // Wait for match table or W-L header to appear (page hydration)
  await page.waitForSelector('text=W-L', { timeout: 10_000 });

  // Check that the filters are present on first load (best-effort)
  const seasonSelector = 'input[name="Season"][value="2021"]';
  const tourneySelector = 'input[name="Tourney"][value="520"]';
  const vsRankSelector = 'input[name="vs Rank"][value="Top100"]';

  await page.waitForSelector(seasonSelector, { timeout: 10_000 });

  expect(await page.isChecked(seasonSelector)).toBeTruthy();
  expect(await page.isChecked(tourneySelector)).toBeTruthy();
  expect(await page.isChecked(vsRankSelector)).toBeTruthy();

  // Reload the page 5 times and capture the URL and console logs after each reload
  for (let i = 0; i < 5; i++) {
    try {
      await page.reload();
      // wait for hydration and filters (longer timeout for flaky reloads)
      await page.waitForSelector(seasonSelector, { timeout: 30_000 });

      const checkedSeason = await page.isChecked(seasonSelector);
      const checkedTourney = await page.isChecked(tourneySelector);
      const checkedVsRank = await page.isChecked(vsRankSelector);

      // Record current URL
      const currentUrl = page.url();
      console.log(`Reload ${i + 1} -> url: ${currentUrl}`);
      console.log(`Reload ${i + 1} -> checked: season=${checkedSeason} tourney=${checkedTourney} vsRank=${checkedVsRank}`);

      // Assert that URL still contains params
      expect(currentUrl.includes('year=2021')).toBeTruthy();
      expect(currentUrl.includes('tourney=520')).toBeTruthy();
      expect(currentUrl.includes('vsRank=Top100')).toBeTruthy();
    } catch (err) {
      console.log(`Reload ${i + 1} failed, dumping collected console messages:`);
      consoleMessages.forEach(m => console.log('  ', m));
      throw err;
    }
  }

  // Dump relevant console debug lines for diagnosis if any suspicious messages
  const interesting = consoleMessages.filter(m => /AllMatches|MatchesFilterPanel|replaceState|queued updateUrl|applying queued|initial keys/i.test(m));
  console.log('Captured debug console messages (filtered):');
  interesting.forEach(m => console.log('  ', m));

});