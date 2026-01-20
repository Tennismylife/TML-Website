import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3000'

test('tournaments streak page: players show flag icons', async ({ page }) => {
  await page.goto(`${BASE}/tournaments/australian-open/records/streak`, { waitUntil: 'networkidle' })

  // Wait for the streak table to render
  await page.waitForSelector('table.min-w-full', { timeout: 10_000 })

  // Find player cells and assert at least one contains an <img> for a flag
  const playerFlagImgs = await page.$$eval('table.min-w-full tbody tr td div img', imgs => imgs.map(i => i.getAttribute('src') || ''))
  expect(playerFlagImgs.length).toBeGreaterThan(0)
})