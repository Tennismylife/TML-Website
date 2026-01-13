import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import * as Route from '../app/api/og/tournament/[id]/route';

describe('OG tournament route', () => {
  let originalFetch: any;

  beforeEach(() => {
    originalFetch = global.fetch;
    // stub fetch used inside the route to fetch tournament header
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ name: 'Australian Open', surfaces: ['Hard'], editions: [2024] }) })));
  });

  afterEach(() => {
    vi.stubGlobal('fetch', originalFetch);
  });

  it('returns an image response for records ages winners', async () => {
    const req = new Request('https://stats.tennismylife.org/api/og/tournament/australian-open?page=records&tab=ages&sub=winners');
    const res: any = await Route.GET(req, { params: { id: 'australian-open' } } as any);

    expect(res).toBeTruthy();
    // ImageResponse returns a Response-like object with status and content-type
    expect(res.status).toBe(200);
    const ct = res.headers.get('content-type') || res.headers.get('Content-Type');
    expect(ct).toBeTruthy();
    expect(ct).toMatch(/image|png|webp/);
  });
});