import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3000'

test('debug: extract flag element and screenshot', async ({ page }) => {
  await page.goto(`${BASE}/tournaments/australian-open/records/streak`, { waitUntil: 'networkidle' })

  // Wait for table rows
  await page.waitForSelector('table.min-w-full tbody tr', { timeout: 10000 })

  // Collect up to 5 img elements under player cells in the streak table
  const imgs = await page.$$eval('table.min-w-full tbody tr td div img', (els) => els.slice(0,5).map(i => ({ outerHTML: i.outerHTML, src: i.getAttribute('src'), alt: i.getAttribute('alt'), display: getComputedStyle(i).display })) )
  const firstCell = await page.locator('table.min-w-full tbody tr td div').first()
  const firstCellHtml = await firstCell.evaluate(el => el.outerHTML)
  // Also gather any span text inside first cell (flag emoji fallback)
  const spanCount = await firstCell.locator('span').count()
  let spanText: string | null = null
  if (spanCount > 0) spanText = await firstCell.locator('span').first().evaluate(s => s.textContent)

  console.log('firstCell.outerHTML:', firstCellHtml)
  console.log('imgs sample:', JSON.stringify(imgs, null, 2))
  console.log('spanText (first cell):', spanText)

  // Screenshot area
  const table = await page.locator('table.min-w-full').first()
  await table.screenshot({ path: 'tmp/streak-table-flag-debug.png' })

  // Basic assertions (not failing the run, just for visibility)
  expect(playerCell).toBeTruthy()
})