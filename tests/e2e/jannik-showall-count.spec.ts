import { test, expect } from '@playwright/test';

test('Jannik Sinner initial 10 then Show All loads W+L matches', async ({ page }) => {
  const url = '/players/jannik-sinner/matches';

  // Capture /api/players/allmatches responses
  const matchesResponses: any[] = [];
  page.on('response', resp => {
    if (resp.url().includes('/api/players/allmatches')) matchesResponses.push(resp);
  });

  await page.goto(url, { waitUntil: 'networkidle' });

  // Confirm visible rows are 10
  const rows = page.locator('table:visible tbody tr');
  await expect(rows).toHaveCount(10);

  // Wait for the VISIBLE W-L element and read it
  const wlLocator = page.locator('div:has-text("W-L:"):visible').first();
  await expect(wlLocator).toContainText(/W-L:/, { timeout: 10000 });
  const wlText = await wlLocator.innerText();
  console.log('[wlText]', wlText);
  // Try robust matching: accept different dash characters and extra spaces
  const match = wlText.match(/W-L:\s*(\d+)\s*[-–—]\s*(\d+)/) || wlText.match(/W-L:\s*(\d+)-(\d+)/) || wlText.match(/(\d+)\s*-\s*(\d+)/);
  expect(match, `W-L text did not match expected format: ${wlText}`).not.toBeNull();
  const wins = Number(match![1]);
  const losses = Number(match![2]);
  const total = wins + losses;

  // Click Show All and wait for subsequent full-list response
  const [fullResp] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/players/allmatches') && r.request().method() === 'GET' && !r.url().includes('limit=')),
    page.click('text=Show All matches')
  ]);

  expect(fullResp.ok()).toBeTruthy();
  const fullJson = await fullResp.json();
  expect(Array.isArray(fullJson)).toBeTruthy();
  // The API should return total == wins+losses
  expect(fullJson.length).toBe(total);

  // Table should now show total rows
  await expect(rows).toHaveCount(total);
});