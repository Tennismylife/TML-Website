import { test, expect } from '@playwright/test'

test.describe('Records SSR smoke', () => {
  test('streak/wins with query renders server wrapper', async ({ request, baseURL }) => {
    const url = `${baseURL}/records/streak/wins?surface=Clay&level=M`
    const res = await request.get(url)
    expect(res.status()).toBe(200)
    const text = await res.text()
    // Ensure server-rendered content is present (tab navigation renders on the server)
    expect(text).toContain('aria-label="Record tabs"')
    expect(text).toContain('STREAK Records')
  })

  test('entries with query renders server wrapper', async ({ request, baseURL }) => {
    const url = `${baseURL}/records/entries?surface=Clay&level=M`
    const res = await request.get(url)
    expect(res.status()).toBe(200)
    const text = await res.text()
    // Ensure server-rendered content is present (tab navigation renders on the server)
    expect(text).toContain('aria-label="Record tabs"')
    expect(text).toContain('ENTRIES Records')
  })
})