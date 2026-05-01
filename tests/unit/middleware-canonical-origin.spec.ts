/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { middleware } from '../../middleware';

function makeReq(url: string) {
  return { nextUrl: new URL(url), url } as any;
}

describe('middleware canonical origin for redirects', () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global as any, 'fetch');
    // Set canonical site URL to ensure redirects point to https canonical host
    process.env.NEXT_PUBLIC_SITE_URL = 'https://stats.tennismylife.org';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it('returns 308 to HTTPS canonical host for numeric player id', async () => {
    // header API returns slug
    fetchSpy.mockImplementation(async (input: any) => {
      const s = String(input);
      if (s.includes('/api/players/123/header')) {
        return { ok: true, json: async () => ({ slug: 'novak-djokovic' }) } as any;
      }
      return { ok: false } as any;
    });

    const res: any = await middleware(makeReq('http://localhost/players/123'));
    expect(res).toBeTruthy();
    expect(res.status).toBe(308);
    // Location header should be canonical HTTPS host
    const loc = res.headers.get('Location');
    expect(loc).toBe('https://stats.tennismylife.org/players/novak-djokovic');
  });

  it('returns 308 to HTTPS canonical host for slug-map fallback', async () => {
    // slug-map API returns mapping
    fetchSpy.mockImplementation(async (input: any) => {
      const s = String(input);
      if (s.includes('/api/slug-map')) {
        return { ok: true, json: async () => ({ players: { 'ABC123': 'some-player' } }) } as any;
      }
      return { ok: false } as any;
    });

    const res: any = await middleware(makeReq('http://localhost/players/abc123'));
    expect(res).toBeTruthy();
    expect(res.status).toBe(308);
    const loc = res.headers.get('Location');
    expect(loc).toBe('https://stats.tennismylife.org/players/some-player');
  });
});