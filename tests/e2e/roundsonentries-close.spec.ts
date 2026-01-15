import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

// Repro for: when closing Rounds On Entries modal the app navigates to Timespan
test('roundsonentries: close modal should restore background and not navigate to Timespan (tournament)', async ({ page }) => {
  await page.goto(`${BASE}/tournaments/200/records`);

  // Open the Rounds on Entries tab
  await page.click('button:has-text("Rounds on Entries")');

  // Wait for RoundsOnEntries data
  await page.waitForResponse(r => r.url().includes('/api/tournaments/') && r.url().includes('/records/roundsonentries') && r.status() === 200, { timeout: 10000 });

  const background = page.url();

  // Dispatch open-modal event directly (helps in test env where no View All present)
  const openPayload = { modal: true, background, section: 'roundsonentries', title: 'SF' };
  await page.evaluate((p) => { try { (window as any).__lastOpenModalPayload = p; window.history.replaceState(p, '', window.location.pathname); window.dispatchEvent(new CustomEvent('open-modal', { detail: p })); } catch (e) {} }, openPayload);

  // Wait for the modal's fetch for full data
  await page.waitForResponse(r => r.url().includes('/records/roundsonentries') && r.url().includes('full=true') && r.status() === 200, { timeout: 15000 });

  // Modal should show a player column header inside the dialog (Player)
  await expect(page.locator('div[role="dialog"] th:has-text("Player")').first()).toBeVisible({ timeout: 15000 });

  // Click Close in modal (use JS click to avoid pointer interception issues)
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').trim() === 'Close');
    if (btn && typeof (btn as any).click === 'function') (btn as HTMLElement).click();
  });

  // Wait for modal to hide and URL to be restored
  await expect(page.locator('th:has-text("Player")')).toBeHidden({ timeout: 5000 });
  expect(page.url()).toBe(background);
  expect(page.url()).not.toContain('/records/timespan');
});

// Also test from global /records page
test('roundsonentries: close modal should restore background and not navigate to Timespan (global records)', async ({ page }) => {
  await page.goto(`${BASE}/records`);

  // Click the Rounds on Entries tab on global records (tolerant selector)
  await page.waitForSelector('text=Rounds on Entries', { timeout: 10000 });
  await page.locator('text=Rounds on Entries').first().click();

  // Do not rely on an initial fetch in CI for this test; capture background and open modal via dispatched event
  const background = page.url();

  // Dispatch open-modal event directly (global records context)
  const backgroundGlobal = page.url();
  const openPayloadGlobal = { modal: true, background: backgroundGlobal, section: 'roundsonentries', title: 'SF' };
  await page.evaluate((p) => { try { (window as any).__lastOpenModalPayload = p; window.history.replaceState(p, '', window.location.pathname); window.dispatchEvent(new CustomEvent('open-modal', { detail: p })); } catch (e) {} }, openPayloadGlobal);

  // Wait for the modal to render (dialog present), don't rely on table content
  await expect(page.locator('div[role="dialog"]')).toBeVisible({ timeout: 15000 });

  // Close (use JS click to avoid pointer interception issues)
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').trim() === 'Close');
    if (btn && typeof (btn as any).click === 'function') (btn as HTMLElement).click();
  });

  await expect(page.locator('div[role="dialog"]')).toBeHidden({ timeout: 5000 });
  expect(page.url()).toBe(backgroundGlobal);
  expect(page.url()).not.toContain('/records/timespan');
});