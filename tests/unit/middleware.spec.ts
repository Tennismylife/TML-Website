/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { middleware } from '../../middleware';
import { NextResponse } from 'next/server';

// Small helper to craft a fake request object
function makeReq(url: string) {
  return { nextUrl: new URL(url), url } as any;
}

describe('legacy redirect middleware', () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global as any, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redirects numeric tournament id via header API with 301', async () => {
    fetchSpy.mockImplementation(async (input: any) => {
      const s = String(input);
      if (s.includes('/api/tournaments/560/header')) {
        return { ok: true, json: async () => ({ slug: 'us-open' }) } as any;
      }
      return { ok: false } as any;
    });

    const res: any = await middleware(makeReq('http://localhost/tournaments/560'));
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toContain('/tournaments/us-open');
  });

  it('redirects mapped player code from local map with 301', async () => {
    // No fetch for slug-map or header should be required; local map contains W367 -> novak-djokovic
    const res: any = await middleware(makeReq('http://localhost/players/W367'));
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toContain('/players/novak-djokovic');
  });
});