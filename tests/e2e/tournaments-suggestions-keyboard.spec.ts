import { test, expect } from '@playwright/test';

test('tournaments: keyboard navigation with arrows + enter navigates to suggestion', async ({ page }) => {
  // Stub tournaments API with multiple matches
  await page.route('**/api/tournaments', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ groups: {
        grandSlams: [],
        masters1000: [],
        finals: [],
        olympics: [],
        others: [
          { id: '200', name: 'Open 200', location: 'Country' },
          { id: '201', name: 'Open 201', location: 'Country' }
        ]
      } })
    });
  });

  const base = process.env.BASE_URL || 'http://localhost:3001';
  await page.goto(`${base}/tournaments`, { waitUntil: 'networkidle' });
  // wait for the input to be attached to the DOM (may be animated into view)
  await page.waitForSelector('#tournament-search', { state: 'attached', timeout: 15_000 });

  await page.fill('#tournament-search', 'Open');

  // Wait for suggestions
  await page.waitForSelector('text=Open 200');

  // Press ArrowDown twice to select second suggestion
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');

  // Press Enter to navigate
  await page.keyboard.press('Enter');

  // Should navigate to tournament 201
  await page.waitForURL('**/tournaments/201**');
  expect(page.url()).toContain('/tournaments/201');
});