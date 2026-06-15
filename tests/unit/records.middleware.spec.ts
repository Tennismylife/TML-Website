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
    expect(res.status).toBe(308);
    const loc = res.headers.get('location');
    expect(loc).toContain('/records/wins/oldest-winners');
    expect(loc).toContain('surface=Hard');
  });

  it('does not redirect when already on canonical path without legacy params', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/wins'));
    // Non-redirect response should be NextResponse (middleware proceeds)
    expect(res).toBeTruthy();
    // Should NOT be a 308 redirect
    expect(res.status).not.toBe(308);
  });

  it('redirects /records/<record>?subtab=<x> to /records/<record>/<x> preserving other params', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/ages?subtab=oldest&surface=Grass'));
    expect(res.status).toBe(308);
    const loc = res.headers.get('location');
    expect(loc).toContain('/records/ages/oldest');
    expect(loc).toContain('surface=Grass');
  });

  it('redirects encoded query paths like /records/played%3Fsurface=Hard to canonical query URLs', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/played%3Fsurface=Hard'));
    expect(res.status).toBe(308);
    const loc = res.headers.get('location');
    expect(loc).toBe('http://localhost/records/played?surface=Hard');
  });

  it('redirects canonical records query paths for played surface filters to canonical page URLs', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/played?surface=Hard&foo=bar'));
    expect(res.status).toBe(308);
    const loc = res.headers.get('location');
    expect(loc).toBe('http://localhost/records/most-matches-played-on-hard-court?foo=bar');
  });

  it('redirects canonical records query paths for played bestOf filters to canonical page URLs', async () => {
    const res3: any = await middleware(makeReq('http://localhost/records/played?bestOf=3&foo=bar'));
    expect(res3.status).toBe(308);
    expect(res3.headers.get('location')).toBe('http://localhost/records/most-matches-played-best-of-3?foo=bar');

    const res5: any = await middleware(makeReq('http://localhost/records/played?bestOf=5&foo=bar'));
    expect(res5.status).toBe(308);
    expect(res5.headers.get('location')).toBe('http://localhost/records/most-matches-played-best-of-5?foo=bar');
  });

  it('redirects bot requests for non-indexable /records/same/wins filter combos to /records/same/wins', async () => {
    const res: any = await middleware(
      makeReq('http://localhost/records/same/wins?level=M&surface=Carpet&round=SF&bestOf=3', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36')
    );
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/same/wins');
  });

  it('redirects bot requests for non-indexable /records/timespan/entries filter combos to /records/timespan/entries', async () => {
    const res: any = await middleware(
      makeReq('http://localhost/records/timespan/entries?level=F&surface=Clay&round=R128&bestOf=1', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36')
    );
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/timespan/entries');
  });

  it('redirects /records/count to /records/rounds', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/count'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/rounds');
  });

  it('redirects /records/count?round=F to /records/most-finals-reached', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/count?round=F'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/most-finals-reached');
  });

  it('redirects /records/count?level=G&round=SF to /records/most-grand-slam-semifinals-reached', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/count?level=G&round=SF'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/most-grand-slam-semifinals-reached');
  });

  it('redirects /records/count?level=G&round=F to /records/most-grand-slam-finals-reached', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/count?level=G&round=F'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/most-grand-slam-finals-reached');
  });

  it('redirects /records/count?level=M&round=QF to /records/most-masters-1000-quarterfinals-reached', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/count?level=M&round=QF'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/most-masters-1000-quarterfinals-reached');
  });

  it('redirects /records/count?level=M&round=SF to /records/most-masters-1000-semifinals-reached', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/count?level=M&round=SF'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/most-masters-1000-semifinals-reached');
  });

  it('redirects /records/titles to /records/most-atp-titles', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/titles'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/most-atp-titles');
  });

  it('redirects /records/entries to /records/most-appearances', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/entries'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/most-appearances');
  });

  it('redirects /records/ages/oldest to /records/ages/oldest-main-draw-players', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/ages/oldest'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/ages/oldest-main-draw-players');
  });

  it('returns 410 for invalid title page filter values on canonical title route', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/most-atp-titles?level=A'));
    expect(res.status).toBe(410);
  });

  it('redirects /records/most-atp-titles?level=250 to /records/most-atp-250-titles', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/most-atp-titles?level=250'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/most-atp-250-titles');
  });

  it('redirects /records/most-atp-titles?level=500 to /records/most-atp-500-titles', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/most-atp-titles?level=500'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/most-atp-500-titles');
  });

  it('redirects /records/most-atp-titles?level=G to title-derived canonical', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/most-atp-titles?level=G'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/most-grand-slam-titles');
  });

  it('redirects /records/most-atp-titles?surface=Hard to title-derived canonical', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/most-atp-titles?surface=Hard'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/most-titles-won-on-hard-court');
  });

  it('redirects /records/most-atp-titles?level=G&surface=Clay to title-derived canonical', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/most-atp-titles?level=G&surface=Clay'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/most-clay-court-grand-slam-titles');
  });

  it('redirects /records/most-atp-titles?level=M&surface=Hard to title-derived canonical', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/most-atp-titles?level=M&surface=Hard'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/most-masters-1000-hard-court-titles');
  });

  it('redirects /records/most-atp-titles?level=M&surface=Clay to title-derived canonical', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/most-atp-titles?level=M&surface=Clay'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/most-masters-1000-clay-court-titles');
  });

  it('returns 410 for invalid filter combination on canonical alias page (round on titles)', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/most-atp-titles?round=F'));
    expect(res.status).toBe(410);
  });

  it('redirects /records/titles?level=250 to /records/most-atp-250-titles', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/titles?level=250'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/most-atp-250-titles');
  });

  it('redirects /records/titles?level=500 to /records/most-atp-500-titles', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/titles?level=500'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/most-atp-500-titles');
  });

  it('redirects /records/count?level=M&round=F to /records/most-masters-1000-finals-reached', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/count?level=M&round=F'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/most-masters-1000-finals-reached');
  });

  it('redirects /records/rounds to /records/rounds?round=F', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/rounds'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/rounds?round=F');
  });

  it('redirects /records/rounds?round=QF to /records/most-quarterfinals-reached', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/rounds?round=QF'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/most-quarterfinals-reached');
  });

  it('redirects /records/rounds?round=SF to /records/most-semifinals-reached', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/rounds?round=SF'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/most-semifinals-reached');
  });

  it('redirects /records/rounds?round=F to /records/most-finals-reached', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/rounds?round=F'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost/records/most-finals-reached');
  });

  it('does not return 410 for /records/rounds?round=SF', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/rounds?round=SF'));
    expect(res.status).not.toBe(410);
    expect(res.status).not.toBe(404);
  });

  it('normalizes camelCase subtab and redirects to kebab-case path', async () => {
    const res: any = await middleware(makeReq('http://localhost/records/ages?subtab=youngestWinners&foo=bar'));
    expect(res.status).toBe(308);
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

  it('redirects malformed surface filter values on records pages to cleaned URL', async () => {
    const res: any = await middleware(
      makeReq('http://localhost/records/roundsonentries/round?level=250&surface=Hardace%3Dhard&round=SF')
    );
    expect(res.status).toBe(307);
    const loc = res.headers.get('location');
    expect(loc).toContain('/records/roundsonentries/round');
    expect(loc).toContain('level=250');
    expect(loc).toContain('surface=Hard');
    expect(loc).toContain('round=SF');
    expect(loc).not.toContain('Hardace');
  });

  it('redirects malformed surface prefix values like Grassrass to canonical surface', async () => {
    const res: any = await middleware(
      makeReq('http://localhost/records/counterseasons/round?level=250&surface=Grassrass')
    );
    expect(res.status).toBe(307);
    const loc = res.headers.get('location');
    expect(loc).toContain('/records/counterseasons/round');
    expect(loc).toContain('level=250');
    expect(loc).toContain('surface=Grass');
    expect(loc).not.toContain('Grassrass');
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