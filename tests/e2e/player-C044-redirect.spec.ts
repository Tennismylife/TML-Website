import { test, expect } from '@playwright/test';

test('legacy player code C044 redirects to jimmy-connors canonical matches URL', async ({ page }) => {
  // Mock slug-map so middleware/header API can resolve the legacy id to the slug
  await page.route('https://stats.tennismylife.org/api/slug-map', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players: { C044: 'jimmy-connors' } }),
    });
  });

  const response = await page.goto('/players/C044/matches', { waitUntil: 'domcontentloaded' });
  expect(response).not.toBeNull();
  // Middleware should perform a 301 to the canonical slug
  const redirectedFrom = response!.request().redirectedFrom();
  expect(redirectedFrom).not.toBeNull();
  expect(page.url()).toContain('/players/jimmy-connors/matches');
});
