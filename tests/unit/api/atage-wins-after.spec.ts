import { expect, it, describe, beforeEach, vi } from 'vitest';

beforeEach(() => {
  globalThis.prisma = {
    mvWinsAges: { findMany: vi.fn() },
    player: { findMany: vi.fn() },
    match: { findMany: vi.fn() },
  } as any;
});

describe('GET /api/records/atage/wins (after behavior)', () => {
  it('sums victories for ages >= targetAge when after=1 (materialized view)', async () => {
    // mvWinsAges mock: player p1 has some wins at several ages
    (globalThis.prisma!.mvWinsAges!.findMany as any).mockResolvedValueOnce([
      {
        winner_id: 'p1',
        ages_json: { '39.000': 2, '40.000': 1, '41.500': 3 },
        ages_by_surface_json: {},
        ages_by_level_json: { G: { '39.000': 2, '40.000': 1, '41.500': 3 } },
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

    const { GET } = await import('@/app/api/records/atage/wins/route');
    const req = new Request('http://localhost/api?age=40.000&after=1&level=G');
    const res = await GET(req as any);
    const body = await res.json();
    if ((res as any).status !== 200) {
      // eslint-disable-next-line no-console
      console.log('DEBUG wins after status:', (res as any).status, 'body:', body);
      throw new Error(`API returned status ${(res as any).status}: ${JSON.stringify(body)}`);
    }
    expect((res as any).status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    const map = new Map(body.map((r: any) => [r.id, r.wins_at_age]));
    // ages >= 40 => counts at 40.000 (1) + 41.500 (3) = 4
    expect(map.get('p1')).toBe(4);
  });
});