import { describe, it, beforeEach, afterEach, vi } from 'vitest';
import * as Route from '../app/api/og/tournament/[id]/route';
import fs from 'fs';

// A tiny 1x1 transparent PNG (base64)
const smallPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAn8B9n1r2QAAAABJRU5ErkJggg==';

describe('save OG image to preview.png', () => {
  let origFetch: any;

  beforeEach(() => {
    origFetch = global.fetch;
    vi.stubGlobal('fetch', vi.fn(async (url: any) => {
      const s = String(url);
      if (s.includes('/api/tournaments/') && s.includes('/header')) {
        return { ok: true, json: async () => ({ name: 'Australian Open', surfaces: ['Hard'], editions: [2024] }) };
      }
      if (s.endsWith('header-480.avif')) {
        const buf = Buffer.from(smallPngBase64, 'base64');
        const ab = (new Uint8Array(buf)).buffer;
        return {
          ok: true,
          arrayBuffer: async () => ab,
          text: async () => '',
          headers: { get: (h: string) => (h === 'content-type' ? 'image/png' : null) },
        };
      }
      return { ok: false, text: async () => '', arrayBuffer: async () => Buffer.alloc(0), headers: { get: (_: string) => null } };
    }));
  });

  afterEach(() => {
    vi.stubGlobal('fetch', origFetch);
  });

  it('writes image for records count', async () => {
    const req = new Request('http://localhost/?page=records&tab=count');
    const res: any = await Route.GET(req, { params: { id: 'australian-open' } } as any);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync('preview.png', buf);
    console.log('Saved preview.png', buf.length, 'bytes');
  });
});