import { test, expect } from '@playwright/test';

test('"View All Matches" uses canonical slug when starting from ID path', async ({ page }) => {
  // Mock header resolution so the client can retrieve canonical slug
  await page.route('**/api/players/A0E2/header', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'A0E2', slug: 'carlos-alcaraz', name: 'Carlos Alcaraz' }),
    });
  });

  // Start at the season page using the legacy/ID-style path
  await page.goto('/players/A0E2/season/2024', { waitUntil: 'networkidle' });

  // Wait for the big "View All Matches" button and click it; expect navigation to the slug-based matches URL
  await page.waitForSelector('button:has-text("View All Matches")', { timeout: 5000 });
  await Promise.all([
    page.waitForURL('**/players/carlos-alcaraz/matches?year=2024**'),
    page.click('button:has-text("View All Matches")')
  ]);

  expect(page.url()).toContain('/players/carlos-alcaraz/matches?year=2024');

  // Sanity: destination page should show the player's name in the header
  const h1 = page.locator('h1');
  await expect(h1).toHaveText(/Carlos Alcaraz/);
});