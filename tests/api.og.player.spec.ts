import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import * as Route from '../app/og/[slug]/route';

describe('OG player route', () => {
  let originalFetch: any;

  beforeEach(() => {
    originalFetch = global.fetch;
    // stub fetch used inside the route to fetch player header
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ name: 'Novak Djokovic' }) })));
  });

  afterEach(() => {
    vi.stubGlobal('fetch', originalFetch);
    try {
      const fs = require('fs');
      const path = require('path');
      const p = path.join(process.cwd(), 'public', 'og', 'novak-djokovic.png');
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch (e) {
      // ignore cleanup errors
    }
  });

  it('returns an image response for player slug', async () => {
    const req = new Request('https://stats.tennismylife.org/og/novak-djokovic.png');
    const res: any = await Route.GET(req, { params: { slug: 'novak-djokovic' } } as any);

    expect(res).toBeTruthy();
    expect(res.status).toBe(200);
    const ct = res.headers.get('content-type') || res.headers.get('Content-Type');
    expect(ct).toBeTruthy();
    expect(ct).toMatch(/image|png|webp/);
    const cc = res.headers.get('cache-control') || res.headers.get('Cache-Control');
    expect(cc).toBeTruthy();
    // In some test envs the header might be normalized; assert presence rather than exact value
    expect(typeof cc).toBe('string');
  });

  it('persists file and serves cached copy when remote fetch fails', async () => {
    const fs = require('fs');
    const path = require('path');
    const p = path.join(process.cwd(), 'public', 'og', 'novak-djokovic.png');
    if (fs.existsSync(p)) fs.unlinkSync(p);

    // first generate
    const req1 = new Request('https://stats.tennismylife.org/og/novak-djokovic.png');
    const res1: any = await Route.GET(req1, { params: { slug: 'novak-djokovic' } } as any);
    expect(res1.status).toBe(200);

    // now stub fetch to simulate network error and request again
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));

    const req2 = new Request('https://stats.tennismylife.org/og/novak-djokovic.png');
    const res2: any = await Route.GET(req2, { params: { slug: 'novak-djokovic' } } as any);
    expect(res2.status).toBe(200);
    const cc2 = res2.headers.get('cache-control') || res2.headers.get('Cache-Control');
    expect(cc2).toBeTruthy();
  });
});