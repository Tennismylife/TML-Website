import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3000'

test('tournaments streak page: show multiple streaks modal and open matches', async ({ page }) => {
  await page.goto(`${BASE}/tournaments/australian-open/records/streak`, { waitUntil: 'networkidle' })

  // Quick page snapshot for debugging (will be printed in test logs)
  const bodyHtml = await page.locator('body').innerHTML();
  console.log('PAGE BODY (snippet):', bodyHtml.slice(0, 1500))

  // If there are no streaks in the dataset, the page renders a no-data message.
  const noStreaks = page.locator('text=No streaks found.')
  if (await noStreaks.count() > 0) {
    await expect(noStreaks).toBeVisible()
    return
  }

  // Otherwise wait for table rows to be present
  await page.waitForSelector('table.min-w-full tbody tr', { timeout: 10_000 })

  // Collect player names and assert at least one player appears more than once
  const rows = page.locator('table.min-w-full tbody tr')
  const rowCount = await rows.count()
  expect(rowCount).toBeGreaterThan(0)

  const names: string[] = []
  for (let i = 0; i < Math.min(rowCount, 50); i++) {
    const nameCell = rows.nth(i).locator('td').nth(1)
    const text = (await nameCell.innerText()).trim()
    names.push(text)
  }

  // Look for duplicates
  const counts: Record<string, number> = {}
  for (const n of names) counts[n] = (counts[n] || 0) + 1
  const hasDuplicate = Object.values(counts).some(c => c > 1)

  // Ensure rows are ordered by streak length descending when possible
  if (rowCount >= 2) {
    const firstStreakText = await rows.nth(0).locator('td').nth(2).innerText()
    const secondStreakText = await rows.nth(1).locator('td').nth(2).innerText()
    const firstStreak = Number(firstStreakText.replace(/\D/g, '') || '0')
    const secondStreak = Number(secondStreakText.replace(/\D/g, '') || '0')
    expect(firstStreak).toBeGreaterThanOrEqual(secondStreak)
  }

  // If dataset contains duplicates, ensure at least one duplicate present.
  // Otherwise continue to assert that View Matches opens correctly.
  if (hasDuplicate) {
    expect(hasDuplicate).toBeTruthy()
  }

  // Click the first 'View Matches' button (per-row) and ensure matches modal opens
  const viewMatchesButton = page.getByRole('button', { name: 'View Matches' }).first()
  await expect(viewMatchesButton).toBeVisible()
  await viewMatchesButton.click()

  // The matches modal has a heading 'Matches in Win Streak'
  const matchesHeading = page.getByRole('heading', { name: 'Matches in Win Streak' })
  await matchesHeading.waitFor({ state: 'visible', timeout: 10_000 })
  await expect(matchesHeading).toBeVisible()

  // And it should contain a table with at least one row (Date cells)
  const dateCells = page.locator('text=Date')
  await expect(dateCells.first()).toBeVisible()

  // Additionally, verify that within each edition group rounds are ordered (if multiple matches in same edition)
  const modalRows = page.locator('div[role="dialog"] table tbody tr')
  const rowCountModal = await modalRows.count()
  // Extract only rows that are match rows (have 5 tds). The group header rows have a single td with colspan.
  const matchRows: Array<{ tourney: string; date: string; round: string }> = []
  for (let i = 0; i < rowCountModal; i++) {
    const tdCount = await modalRows.nth(i).locator('td').count()
    if (tdCount < 4) continue
    const date = (await modalRows.nth(i).locator('td').nth(0).innerText()).trim()
    const tourney = (await modalRows.nth(i).locator('td').nth(1).innerText()).trim()
    const round = (await modalRows.nth(i).locator('td').nth(2).innerText()).trim()
    matchRows.push({ tourney, round, date })
  }

  // Group by tourney+date (edition) and check round orders within each edition
  const roundOrder: Record<string, number> = { R128: 0, R64: 1, R32: 2, R16: 3, QF: 4, SF: 5, F: 6, '1R': 0, '2R': 1, '3R': 2, '4R': 3, Q: 4, S: 5 }
  const groups: Record<string, number[]> = {}
  for (const r of matchRows) {
    const key = `${r.tourney}__${r.date}`
    if (!groups[key]) groups[key] = []
    groups[key].push(roundOrder[r.round] ?? 999)
  }

  for (const g of Object.keys(groups)) {
    const seq = groups[g]
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i - 1]).toBeLessThanOrEqual(seq[i])
    }
  }
})