import { expect, it, describe, beforeEach, vi } from 'vitest';

beforeEach(() => {
  globalThis.prisma = {
    mVEntriesAges: { findMany: vi.fn() },
    player: { findMany: vi.fn(), findUnique: vi.fn() },
    match: { findMany: vi.fn() },
  } as any;
});

describe('GET /api/records/atage/entries CASE1 dedup by event', () => {
  it('counts unique events >= targetAge using matches for entries', async () => {
    const { GET } = await import('@/app/api/records/atage/entries/route');

    // MV returns a candidate player
    (globalThis.prisma!.mVEntriesAges!.findMany as any).mockResolvedValueOnce([
      { player_id: 'p1', ages_json: { '40.200': 1 }, ages_by_surface_json: { 'G': { '40.200': 1 } }, ages_by_level_json: {} }
    ]);

    // players info
    (globalThis.prisma!.player!.findMany as any).mockResolvedValueOnce([
      { id: 'p1', player: 'Player One', ioc: 'SRB' }
    ]);

    // matches: two rows in same event e1 (should count as 1), one in event e2
    (globalThis.prisma!.match!.findMany as any).mockResolvedValueOnce([
      { event_id: 'e1', winner_id: 'p1', winner_age: 40.2, loser_id: null, loser_age: null },
      { event_id: 'e1', winner_id: 'p1', winner_age: 40.2, loser_id: null, loser_age: null },
      { event_id: 'e2', winner_id: null, winner_age: null, loser_id: 'p1', loser_age: 41.1 },
    ]);

    // slug rows
    (globalThis.prisma!.player!.findMany as any).mockResolvedValueOnce([
      { id: 'p1', slug: 'player-one' }
    ]);

    const req = new Request('http://localhost/api?age=40.000&after=1&level=G');
    const res = await GET(req as any);
    const body = await res.json();
    expect((res as any).status).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
    const map = new Map(body.map((r:any)=>[r.id, r.participations_at_age]));
    expect(map.get('p1')).toBe(2); // e1 + e2
  });
});