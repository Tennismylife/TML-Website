/** @vitest-environment node */
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { middleware } from '../../middleware';
import { NextResponse } from 'next/server';

function makeReq(url: string, init?: { headers?: Record<string, string>; method?: string }) {
  const headersMap = new Map<string, string>(Object.entries(init?.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    nextUrl: new URL(url),
    url,
    method: init?.method,
    headers: {
      get(name: string) {
        return headersMap.get(name.toLowerCase()) ?? null;
      },
    },
  } as any;
}

describe('records middleware redirecting legacy queries', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('redirects legacy record+subtab to canonical path (preserves filters)', async () => {
    const res: any = await middleware(makeReq('http://localhost/records?record=wins&subtab=oldest-winners&surface=Hard'));
    expect(res.status).toBe(301);
    const loc = res.headers.get('location');
    expect(loc).toContain('/records/wins/oldest-winners');
    expect(loc).toContain('surface=Hard');
  });

  it('does not redirect when already on canonical path without legacy params', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/wins'));
    // Non-redirect response should be NextResponse (middleware proceeds)
    expect(res).toBeTruthy();
    // Should NOT be a 301 redirect
    expect(res.status).not.toBe(301);
  });

  it('redirects /records/<record>?subtab=<x> to /records/<record>/<x> preserving other params', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/ages?subtab=oldest&surface=Grass'));
    expect(res.status).toBe(301);
    const loc = res.headers.get('location');
    expect(loc).toContain('/records/ages/oldest');
    expect(loc).toContain('surface=Grass');
  });

  it('normalizes camelCase subtab and redirects to kebab-case path', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/ages?subtab=youngestWinners&foo=bar'));
    expect(res.status).toBe(301);
    const loc = res.headers.get('location');
    expect(loc).toContain('/records/ages/youngest-winners');
    expect(loc).toContain('foo=bar');
  });

  it('returns 410 for invalid records page filter combinations', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/ages/youngest-winners?level=G&surface=Hard&round=R32'));
    expect(res.status).toBe(410);
  });

  it('returns 410 for invalid records API filter combinations', async () => {
    const res: any = await middleware(makeReq('http://localhost/api/records/ages/winners?type=youngest&round=R32'));
    expect(res.status).toBe(410);
  });

  it('returns 410 for valid filtered records pages that resolve to empty data', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ topWinners: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res: any = await middleware(makeReq('http://localhost/records/wins?level=M&bestOf=1'));

    expect(res.status).toBe(410);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost/api/records/wins?level=M&bestOf=1', { cache: 'no-store' });
  });

  it('does not return 410 for valid filtered records pages that resolve to rows', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ topWinners: [{ id: '1' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res: any = await middleware(makeReq('http://localhost/records/wins?level=M&bestOf=1'));

    expect(res.status).not.toBe(410);
  });

  it('does not fetch records data when no filter params are present', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res: any = await middleware(makeReq('http://localhost/records/wins'));

    expect(res.status).not.toBe(410);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips the empty-data check for RSC requests', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res: any = await middleware(makeReq('http://localhost/records/wins?level=M&bestOf=1', { headers: { rsc: '1' } }));

    expect(res.status).not.toBe(410);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails open when the empty-data fetch throws', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network'));
    vi.stubGlobal('fetch', fetchMock);

    const res: any = await middleware(makeReq('http://localhost/records/wins?level=M&bestOf=1'));

    expect(res.status).not.toBe(410);
  });
});