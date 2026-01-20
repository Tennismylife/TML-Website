import { test, expect } from '@playwright/test';

test('tournaments: suggestions appear while typing and navigate on click', async ({ page }) => {
  // Stub tournaments API with a small dataset
  await page.route('**/api/tournaments', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ groups: {
        grandSlams: [],
        masters1000: [],
        finals: [],
        olympics: [],
        others: [ { id: '200', name: 'Open 200', location: 'Country' }, { id: '201', name: 'Open 201', location: 'Country' } ]
      } })
    });
  });

  const base = process.env.BASE_URL || 'http://localhost:3000';
  await page.goto(`${base}/tournaments`);

  await page.waitForSelector('#tournament-search');

  await page.fill('#tournament-search', 'Open');

  // suggestions are shown immediately while typing
  await page.waitForSelector('text=Open 200');

  // Test keyboard: ArrowDown + Enter should navigate to the first suggestion
  await page.focus('#tournament-search');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForURL('**/tournaments/200**');
  expect(page.url()).toContain('/tournaments/200');

  // Navigate back and test clicking suggestion also works
  await page.goBack();
  await page.waitForSelector('#tournament-search');
  await page.fill('#tournament-search', 'Open');
  await page.waitForSelector('text=Open 200');
  await page.click('text=Open 200');
  await page.waitForURL('**/tournaments/200**');
  expect(page.url()).toContain('/tournaments/200');
});