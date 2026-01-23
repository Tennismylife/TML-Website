import { test, expect } from '@playwright/test'

test.describe('SEO: View Records link is present but visually hidden', () => {
  test('record link exists in DOM and is sr-only', async ({ request, baseURL }) => {
    const url = `${baseURL}/tournaments/australian-open/2026`;
    const res = await request.get(url);
    if (res.status() !== 200) {
      const body = await res.text();
      // dump server response for debugging
      // eslint-disable-next-line no-console
      console.error('Non-200 response for SEO test', { status: res.status(), body: body.slice(0, 2000) });
    }
    expect(res.status()).toBe(200);
    const text = await res.text();

    // The link should be present in the HTML for crawlers
    expect(text).toContain('View Records of the Tournament');
    expect(text).toContain('/tournaments/australian-open/2026/records');
    // The link should be visually hidden using Tailwind's sr-only class
    expect(text).toMatch(/class=("|')sr-only("|')/);
  })
})
