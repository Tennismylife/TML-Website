import { test, expect } from '@playwright/test';

test('legacy player code T0HA resolves to canonical slug via slug-map and links use slug', async ({ page }) => {
  // Mock slug-map so header route can resolve the legacy code to a known slug
  await page.route('https://stats.tennismylife.org/api/slug-map', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players: { T0HA: 'carlos-alcaraz' } }),
    });
  });

  // Go to the legacy id season page
  await page.goto('/players/T0HA/season/2024', { waitUntil: 'networkidle' });

  // Wait for the header API to respond (the route should now map legacy id to slug)
  await page.waitForResponse(r => r.url().endsWith('/api/players/T0HA/header') && r.status() === 200, { timeout: 5000 });

  // Click the big "View All Matches" button and expect navigation to the slug-based matches URL
  await Promise.all([
    page.waitForURL('**/players/carlos-alcaraz/matches?year=2024**'),
    page.click('button:has-text("View All Matches")')
  ]);

  expect(page.url()).toContain('/players/carlos-alcaraz/matches?year=2024');
});