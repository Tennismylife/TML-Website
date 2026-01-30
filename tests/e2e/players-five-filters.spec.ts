import { test, expect } from '@playwright/test';

test('Page opens with 5 filters selected via URL', async ({ page }) => {
  // Five filters: year, surface, vsAge, set, round
  const url = '/players/frances-tiafoe/matches?year=2024&surface=Hard&vsAge=Younger&set=Deciders&round=F';

  // Capture any /api/players/allmatches responses
  const matchesResponses: any[] = [];
  page.on('response', resp => {
    if (resp.url().includes('/api/players/allmatches')) matchesResponses.push(resp);
  });

  // Attach console/pageerror listeners for easier debugging
  page.on('console', msg => console.log('[page]', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('[pageerror]', err.message));

  await page.goto(url, { waitUntil: 'networkidle' });

  // Wait for season input to appear (Category will open if seeded)
  await page.waitForSelector('input[name="Season"][value="2024"]', { timeout: 10000 });

  // Assert UI filter inputs are selected
  await expect(page.locator('input[name="Season"][value="2024"]')).toBeChecked();
  await expect(page.locator('input[name="Surface"][value="Hard"]')).toBeChecked();
  await expect(page.locator('input[name="vs Age"][value="Younger"]')).toBeChecked();
  await expect(page.locator('input[name="Sets"][value="Deciders"]')).toBeChecked();
  await expect(page.locator('input[name="Round"][value="F"]')).toBeChecked();

  // If a client API call was made, ensure it included all query params
  const respWithAll = matchesResponses.find(r => {
    const u = r.request().url();
    return u.includes('year=2024') && u.includes('surface=Hard') && u.includes('vsAge=Younger') && u.includes('set=Deciders') && u.includes('round=F');
  });

  if (respWithAll) {
    expect(respWithAll.ok()).toBeTruthy();
    const json = await respWithAll.json();
    expect(Array.isArray(json)).toBeTruthy();
  }

  // Verify visible table rows' Surface column contains 'Hard' (if there are rows)
  const rows = page.locator('table:visible tbody tr');
  const count = await rows.count();
  if (count > 0) {
    for (let i = 0; i < count; i++) {
      const surfaceCell = await rows.nth(i).locator('td').nth(2).innerText();
      expect(surfaceCell.toLowerCase()).toContain('hard');
    }
  }
});