import { expect, it, describe, beforeEach, vi } from 'vitest';

beforeEach(() => {
  globalThis.prisma = {
    mVPlayedAges: { findMany: vi.fn() },
    player: { findMany: vi.fn() },
    match: { findMany: vi.fn() },
  } as any;
});

describe('GET /api/records/atage/played (after behavior)', () => {
  it('sums matches played for ages >= targetAge when after=1 (materialized view)', async () => {
    (globalThis.prisma!.mVPlayedAges!.findMany as any).mockResolvedValueOnce([
      {
        player_id: 'p1',
        ages_json: { '1': 39.000, '2': 40.000, '3': 42.000, '4': 39.999 },
        ages_by_surface_json: {},
        ages_by_level_json: { G: { '1': 39.000, '2': 40.000, '3': 42.000, '4': 39.999 } },
      },
    ]);

    (globalThis.prisma!.player!.findMany as any).mockResolvedValueOnce([
      { id: 'p1', player: 'Player One', ioc: 'SRB' },
    ]);
    (globalThis.prisma!.player!.findMany as any).mockResolvedValueOnce([
      { id: 'p1', slug: 'player-one' },
    ]);

    const { GET } = await import('@/app/api/records/atage/played/route');
    const req = new Request('http://localhost/api?age=40.000&after=1&level=G');
    const res = await GET(req as any);
    const body = await res.json();
    if ((res as any).status !== 200) {
      // eslint-disable-next-line no-console
      console.log('DEBUG played after status:', (res as any).status, 'body:', body);
      throw new Error(`API returned status ${(res as any).status}: ${JSON.stringify(body)}`);
    }
    expect((res as any).status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    const map = new Map(body.map((r: any) => [r.id, r.played_at_age]));
    // ages >=40 => two matches (ages 40.000 and 42.000)
    expect(map.get('p1')).toBe(2);
  });
});