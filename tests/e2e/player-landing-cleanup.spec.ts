import { test, expect } from '@playwright/test';

test('player landing strips filters and redirects to canonical landing URL', async ({ page, baseURL }) => {
  const startUrl = '/players/novak-djokovic?result=Win&level=A&surface=Hard';
  const expectedUrl = `${baseURL}/players/novak-djokovic`;

  await page.goto(startUrl, { waitUntil: 'domcontentloaded' });
  expect(page.url()).toBe(expectedUrl);
});
