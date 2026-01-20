import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3000'

test('tournaments streak page: H1 is visible and not overlapped by header', async ({ page }) => {
  await page.goto(`${BASE}/tournaments/australian-open/records/streak`, { waitUntil: 'networkidle' })

  // Wait for header and H1 to be attached
  const header = page.locator('header')
  const h1 = page.locator('h1')
  await header.waitFor({ state: 'visible', timeout: 10_000 })
  await h1.waitFor({ state: 'visible', timeout: 10_000 })

  // Basic visibility check
  expect(await h1.isVisible()).toBeTruthy()

  // Get bounding boxes to ensure H1 is not covered by a fixed/sticky header
  const headerBox = await header.boundingBox()
  const h1Box = await h1.boundingBox()

  // If we can't compute boxes, fail early with helpful message
  if (!headerBox || !h1Box) {
    throw new Error('Could not compute element positions for header and/or h1')
  }

  const headerBottom = headerBox.y + headerBox.height
  const h1Top = h1Box.y

  // Ensure H1 top is at least 8px below header bottom (tunable margin)
  expect(h1Top).toBeGreaterThan(headerBottom + 8)

  // Helpful debug information in case of failure
  console.log('headerBottom:', headerBottom, 'h1Top:', h1Top)
})
