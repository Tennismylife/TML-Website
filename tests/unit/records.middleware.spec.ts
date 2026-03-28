/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { middleware } from '../../middleware';
import { NextResponse } from 'next/server';

function makeReq(url: string, headers: Record<string, string> = {}) {
  return {
    nextUrl: new URL(url),
    url,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
  } as any;
}

describe('records middleware redirecting legacy queries', () => {
  it('redirects legacy record+subtab to canonical path (preserves filters)', async () => {
    const res: any = await middleware(makeReq('http://localhost/records?record=wins&subtab=oldest-winners&surface=Hard'));
    expect(res.status).toBe(301);
    const loc = res.headers.get('location');
    expect(loc).toContain('/records/wins/oldest-winners');
    expect(loc).toContain('surface=Hard');
  });

  it('does not redirect when already on canonical path without legacy params', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/wins'));
    expect(res).toBeTruthy();
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
});

describe('records middleware 410 for empty-data pages', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns 410 when API returns empty array for filtered records page', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/wins?surface=Grass'));
    expect(res.status).toBe(410);
  });

  it('returns 410 when API returns object with empty topWinners', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ topWinners: [] }),
    }));
    const res: any = await middleware(makeReq('http://localhost/records/wins?surface=Grass'));
    expect(res.status).toBe(410);
  });

  it('passes through (no 410) when API returns non-empty data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ rank: 1, player: 'Federer' }]),
    }));
    const res: any = await middleware(makeReq('http://localhost/records/wins?surface=Grass'));
    expect(res?.status).not.toBe(410);
  });

  it('does not check data and does not return 410 when no filter params are present', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/wins'));
    expect(res?.status).not.toBe(410);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('skips empty-data check for RSC requests (client-side navigation)', async () => {
    const res: any = await middleware(
      makeReq('http://localhost/records/wins?surface=Grass', { rsc: '1' })
    );
    expect(res?.status).not.toBe(410);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('fails open (no 410) when API call throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    const res: any = await middleware(makeReq('http://localhost/records/wins?surface=Grass'));
    expect(res?.status).not.toBe(410);
  });
});