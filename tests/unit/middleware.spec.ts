/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { middleware } from '../../middleware';
import { NextResponse } from 'next/server';

// Small helper to craft a fake request object
function makeReq(url: string, userAgent?: string) {
  return {
    nextUrl: new URL(url),
    url,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'user-agent' ? (userAgent ?? null) : null),
    },
  } as any;
}

describe('legacy redirect middleware', () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global as any, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redirects numeric tournament id via header API with 308', async () => {
    fetchSpy.mockImplementation(async (input: any) => {
      const s = String(input);
      if (s.includes('/api/tournaments/560/header')) {
        return { ok: true, json: async () => ({ slug: 'us-open' }) } as any;
      }
      return { ok: false } as any;
    });

    const res: any = await middleware(makeReq('http://localhost/tournaments/560'));
    expect(res).toBeTruthy();
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toContain('/tournaments/us-open');
  });

  it('redirects mapped player code from local map with 308', async () => {
    // No fetch for slug-map or header should be required; local map contains W367 -> novak-djokovic
    const res: any = await middleware(makeReq('http://localhost/players/W367'));
    expect(res).toBeTruthy();
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toContain('/players/novak-djokovic');
  });

  it('redirects explicit legacy player C044 to canonical slug (jimmy-connors) with 308', async () => {
    fetchSpy.mockImplementation(async (input: any) => {
      const s = String(input);
      if (s.includes('/api/slug-map')) {
        return { ok: true, json: async () => ({ players: { C044: 'jimmy-connors' } }) } as any;
      }
      return { ok: false } as any;
    });

    const res: any = await middleware(makeReq('http://localhost/players/C044/matches'));
    expect(res).toBeTruthy();
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toContain('/players/jimmy-connors/matches');
  });

  it('redirects canonical player matches URLs to the player landing page with 308', async () => {
    const res: any = await middleware(makeReq('http://localhost/players/roger-federer/matches'));
    expect(res).toBeTruthy();
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/players/roger-federer');
  });

  it('redirects noindex player season pages to the player landing page with 308', async () => {
    fetchSpy.mockImplementation(async (input: any) => {
      const url = String(input);
      if (url.includes('/api/players/roger-federer/season-robots?year=2018')) {
        return { ok: true, json: async () => ({ index: false }) } as any;
      }
      return { ok: false } as any;
    });

    const res: any = await middleware(
      makeReq('http://localhost/players/roger-federer/season/2018', 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')
    );
    expect(res).toBeTruthy();
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/players/roger-federer');
  });
});