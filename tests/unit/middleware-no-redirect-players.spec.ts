import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../../middleware';

describe('middleware player redirect -> canonical slug', () => {
  it('returns 301 for players when slug-map resolves a legacy code', async () => {
    // Mock fetch for /api/slug-map used in middleware
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/slug-map')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ players: { H377: 'dominik-hrbaty' } }) });
      }
      // header API -- emulate not found
      return Promise.resolve({ ok: false });
    }) as any;

    const req: any = {
      nextUrl: new URL('https://stats.tennismylife.org/players/H377?tab=matches'),
      method: 'GET',
      headers: new Map<string, string>(),
    };

    const res = await middleware(req as any);
    // middleware should now return a 301 Response for players when slug resolved
    expect(res).toBeTruthy();
    expect((res as any).status).toBe(301);
    expect((res as any).headers.get('location')).toContain('/players/dominik-hrbaty?tab=matches');
  });
});