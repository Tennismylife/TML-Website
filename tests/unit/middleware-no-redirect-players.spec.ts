import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../../middleware';

describe('middleware player redirect suppression', () => {
  it('does not return 301 for players slug-map matches', async () => {
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
    // middleware should not return a 301 Response for players
    expect(res).toBeTruthy();
    // If it were a redirect Response, it would have status and headers; ensure it is not a 301 redirect
    expect((res as any).status).not.toBe(301);
  });
});