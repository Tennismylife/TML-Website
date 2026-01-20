import { test, expect } from '@playwright/test';

test('players page without tab redirects/defaults to matches', async ({ page }) => {
  // Navigate to player page without tab
  await page.goto('/players/novak-djokovic');
  await page.waitForLoadState('networkidle');

  // URL should be the path-based matches route after server redirect
  expect(page.url()).toContain('/players/novak-djokovic/matches');

  // The Matches tab should be selected
  const matchesTab = await page.waitForSelector('button[role="tab"]:has-text("Matches")');
  expect(await matchesTab.getAttribute('aria-selected')).toBe('true');
});