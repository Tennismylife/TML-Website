/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { middleware } from '../../middleware';
import { NextResponse } from 'next/server';

function makeReq(url: string) {
  return { nextUrl: new URL(url), url } as any;
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

  it('sanitizes malformed records API filters and redirects to cleaned query', async () => {
    const res: any = await middleware(makeReq('http://localhost/api/records/percentage?level=G%5C%5C&round=F%5C&surface=Grass%5C%5C&bestOf=NaN'));
    expect(res.status).toBe(307);
    const loc = res.headers.get('location');
    expect(loc).toContain('/api/records/percentage');
    expect(loc).toContain('level=G');
    expect(loc).toContain('round=F');
    expect(loc).toContain('surface=Grass');
    expect(loc).not.toContain('NaN');
    expect(loc).not.toContain('%5C');
  });
});