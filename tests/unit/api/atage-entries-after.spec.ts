import { expect, it, describe, beforeEach, vi } from 'vitest';

beforeEach(() => {
  globalThis.prisma = {
    mVEntriesAges: { findMany: vi.fn() },
    player: { findMany: vi.fn() },
    match: { findMany: vi.fn() },
  } as any;
});

describe('GET /api/records/atage/entries (after behavior)', () => {
  it('sums all participations for ages >= targetAge when after=1 (materialized view)', async () => {
    // mVEntriesAges mock: player p1 has ages at 39, 40.2 and 41.1 with counts
    (globalThis.prisma!.mVEntriesAges!.findMany as any).mockResolvedValueOnce([
      {
        player_id: 'p1',
        ages_json: { '39.000': 1, '40.200': 1, '41.100': 2 },
        ages_by_surface_json: {},
        ages_by_level_json: { 'G': { '39.000': 1, '40.200': 1, '41.100': 2 } },
      },

    ]);

    // players info (first call)
    (globalThis.prisma!.player!.findMany as any).mockResolvedValueOnce([
      { id: 'p1', player: 'Player One', ioc: 'SRB' },
    ]);
    // slug rows (second call)
    (globalThis.prisma!.player!.findMany as any).mockResolvedValueOnce([
      { id: 'p1', slug: 'player-one' },
    ]);

    const { GET } = await import('@/app/api/records/atage/entries/route');
    // mock matches so dedup by event yields 3 unique events (one at 40.2, two at 41.1)
    (globalThis.prisma!.match!.findMany as any).mockResolvedValueOnce([
      { event_id: 'e1', winner_id: 'p1', winner_age: 40.2, loser_id: null, loser_age: null },
      { event_id: 'e2', winner_id: null, winner_age: null, loser_id: 'p1', loser_age: 41.1 },
      { event_id: 'e3', winner_id: null, winner_age: null, loser_id: 'p1', loser_age: 41.1 },
    ]);

    const req = new Request('http://localhost/api?age=40.000&after=1&level=G');
    const res = await GET(req as any);
    const body = await res.json();
    if ((res as any).status !== 200) {
      // eslint-disable-next-line no-console
      console.log('DEBUG entries after status:', (res as any).status, 'body:', body);
      throw new Error(`API returned status ${(res as any).status}: ${JSON.stringify(body)}`);
    }
    expect((res as any).status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    const map = new Map(body.map((r: any) => [r.id, r.participations_at_age]));
    // Range behavior: ages >= 40 => events e1(40.2) + e2(41.1) + e3(41.1) = 3
    expect(map.get('p1')).toBe(3);
  });
});