/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { middleware } from '../../middleware';

function makeReq(url: string) {
  return { nextUrl: new URL(url), url } as any;
}

describe('middleware loop prevention', () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global as any, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not redirect when request already uses canonical slug (slug-map API)', async () => {
    // slug-map returns US-OPEN -> 'us-open' which equals the requested second segment
    fetchSpy.mockImplementation(async (input: any) => {
      const s = String(input);
      if (s.includes('/api/slug-map')) {
        return { ok: true, json: async () => ({ tournaments: { 'US-OPEN': 'us-open' }, players: {} } ) } as any;
      }
      return { ok: false } as any;
    });

    const res: any = await middleware(makeReq('http://localhost/tournaments/us-open'));
    expect(res).toBeTruthy();
    // Should NOT be a 301 redirect (so no loop)
    expect(res.status).not.toBe(301);
  });
});