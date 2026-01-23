import { test, expect } from '@playwright/test'

test.describe('Tournament Edition ghost 404', () => {
  test('edition page does not render global 404 UI', async ({ request, baseURL }) => {
    const url = `${baseURL}/tournaments/australian-open/1971`;
    const res = await request.get(url);
    expect(res.status()).toBe(200);
    const text = await res.text();
    // Should not include global 404 markup
    expect(text).not.toContain('404 - Page Not Found');
    // Preferably includes key page elements (SportsEvent JSON-LD and BreadcrumbList)
    expect(text).toContain('"@type":"SportsEvent"');
    expect(text).toContain('"startDate":"1971-03-07"');
    expect(text).toContain('"@type":"BreadcrumbList"');
  })
})
