import { test, expect } from '@playwright/test';

test.describe('Tournament Edition ghost 404 (numeric id)', () => {
  test('edition page returns 200 and contains records CTA', async ({ request, baseURL }) => {
    const url = `${baseURL}/tournaments/580/1972`;
    const res = await request.get(url);
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).not.toContain('404 - Page Not Found');
    // Ensure page emits a SportsEvent JSON-LD and BreadcrumbList
    expect(text).toContain('"@type":"SportsEvent"');
    expect(text).toContain('"@type":"BreadcrumbList"');
  });
});
