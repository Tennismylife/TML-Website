import { test, expect } from '@playwright/test';

test('Players matches page applies multiple URL filters (year, surface, vsAge)', async ({ page }) => {
  // Navigate directly with multiple filters in the query string
  const url = '/players/frances-tiafoe/matches?year=2026&vsAge=Over28&surface=Hard';

  // Wait for an API request that contains all expected params
  const responsePromise = page.waitForResponse(resp => {
    const req = resp.request();
    return req.url().includes('/api/players/allmatches') && req.url().includes('year=2026') && req.url().includes('surface=Hard') && req.url().includes('vsAge=Over28');
  });

  await page.goto(url, { waitUntil: 'networkidle' });

  // Ensure the API call happened and inspect the response
  const resp = await responsePromise;
  expect(resp.ok()).toBeTruthy();
  const json = await resp.json();
  // Basic sanity: returned matches array (may be empty) and surfaces include Hard
  expect(Array.isArray(json)).toBeTruthy();

  // Wait for table to be visible
  await page.waitForSelector('table');

  // Check UI filters have been seeded
  // Season (label: "Season")
  const seasonChecked = await page.locator('input[name="Season"][value="2026"]').isChecked();
  expect(seasonChecked).toBeTruthy();

  // Surface (label: "Surface")
  const surfaceChecked = await page.locator('input[name="Surface"][value="Hard"]').isChecked();
  expect(surfaceChecked).toBeTruthy();

  // vs Age (label: "vs Age")
  const vsAgeChecked = await page.locator('input[name="vs Age"][value="Over28"]').isChecked();
  expect(vsAgeChecked).toBeTruthy();

  // Verify that visible table rows have surfaces containing "Hard"
  const rows = page.locator('table tbody tr');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const cell = await rows.nth(i).locator('td').nth(2).innerText(); // 3rd column is surface
    expect(cell).toMatch(/Hard/i);
  }
});