import { test, expect } from '@playwright/test'

test.describe('Tournament Edition JSON-LD & Breadcrumbs', () => {
  test('edition page emits SportsEvent JSON-LD with edition startDate and BreadcrumbList', async ({ request, baseURL }) => {
    const url = `${baseURL}/tournaments/australian-open/2026`;
    const res = await request.get(url);
    expect(res.status()).toBe(200);
    const text = await res.text();

    // Confirm SportsEvent JSON-LD and edition startDate (DB-derived)
    expect(text).toContain('"@type":"SportsEvent"');
    expect(text).toContain('"startDate":"2026-01-18"');

    // Confirm BreadcrumbList JSON-LD with absolute edition URL
    expect(text).toContain('"@type":"BreadcrumbList"');
    expect(text).toContain('"https://stats.tennismylife.org/tournaments/australian-open/2026"');
  })
})
