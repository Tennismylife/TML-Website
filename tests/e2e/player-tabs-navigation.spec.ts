import { test, expect } from '@playwright/test';

const tabs = ['profile','matches','season','tournaments','h2h','performance','statistics'];

test('player tabs navigate to path-based segments', async ({ page }) => {
  // Log client console messages to test output for debugging
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));

  // Start on season with sub=events
  await page.goto('/players/novak-djokovic/season?sub=events');
  await page.waitForLoadState('networkidle');
  // ensure initial state has sub
  expect(await page.evaluate(() => location.search)).toContain('sub=events');

  for (const tab of tabs) {
    // Click the tab button
    const btn = await page.waitForSelector(`button[role="tab"]:has-text("${tab[0].toUpperCase()+tab.slice(1)}")`);
    await btn.click();
    // Wait for navigation to complete (router.push) and pathname to update
    await page.waitForFunction((t) => location.pathname.includes(`/players/novak-djokovic/${t}`), tab, { timeout: 5000 });
    const path = await page.evaluate(() => location.pathname + location.search);
    const search = await page.evaluate(() => location.search);
    console.log('after click ->', tab, path);
    expect(path).toContain(`/players/novak-djokovic/${tab}`);
    // sub=events should only be present for season
    if (tab === 'season') {
      expect(search).toContain('sub=events');
    } else {
      expect(search).not.toContain('sub=events');
    }
  }
});