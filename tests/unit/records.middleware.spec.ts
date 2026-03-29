/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { middleware } from '../../middleware';
import { NextResponse } from 'next/server';

function makeReq(url: string, userAgent?: string) {
  return {
    nextUrl: new URL(url),
    url,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'user-agent' ? (userAgent ?? null) : null),
    },
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

  it('canonicalizes invalid records API filters for node user-agent requests', async () => {
    const res: any = await middleware(
      makeReq('http://localhost/api/records/ages/winners?type=youngest&round=R32&surface=Hard', 'node')
    );
    expect(res.status).toBe(307);
    const loc = res.headers.get('location');
    expect(loc).toContain('/api/records/ages/winners');
    expect(loc).toContain('type=youngest');
    expect(loc).toContain('surface=Hard');
    expect(loc).not.toContain('round=R32');
  });

  it('returns 400 for node records API requests when required params are missing', async () => {
    const res: any = await middleware(
      makeReq('http://localhost/api/records/atage/entries?level=250&round=F&surface=Grass', 'node')
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for node neededto titles API requests missing maxTitles', async () => {
    const res: any = await middleware(
      makeReq('http://localhost/api/records/neededto/titles?surface=Grass', 'node')
    );
    expect(res.status).toBe(400);
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

  it('rewrites malformed records API filters for node user-agent without external redirect', async () => {
    const res: any = await middleware(
      makeReq('http://localhost/api/records/streak/rounds?level=500&round=SF%5C%5C%5C%5C&surface=Grass', 'node')
    );
    expect(res.status).toBe(200);
    const rewritten = res.headers.get('x-middleware-rewrite');
    expect(rewritten).toContain('/api/records/streak/rounds');
    expect(rewritten).toContain('round=SF');
    expect(rewritten).not.toContain('%5C');
  });
});