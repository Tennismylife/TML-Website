import { expect, it, describe, beforeEach, vi } from 'vitest';

// Prepare a fake `prisma` on globalThis before importing the route
beforeEach(() => {
  globalThis.prisma = {
    match: {
      findMany: vi.fn(),
    },
    player: {
      findMany: vi.fn(),
    },
  } as any;
});

describe('GET /api/records/atage/rounds', () => {
  it('for after=1 picks the minimal age >= targetAge and counts only matches at that age', async () => {
    const { GET } = await import('@/app/api/records/atage/rounds/route');

    // Matches: player p1 appears twice: at ages 38.2 and 40.0; player p2 appears once at 39.0
    (globalThis.prisma!.match!.findMany as any).mockResolvedValueOnce([
      { winner_id: 'p1', winner_age: 38.2, loser_id: null, loser_age: null },
      { winner_id: null, winner_age: null, loser_id: 'p1', loser_age: 40.0 },
      { winner_id: 'p2', winner_age: 39.0, loser_id: null, loser_age: null },
    ]);

    // Players info
    (globalThis.prisma!.player!.findMany as any).mockResolvedValueOnce([
      { id: 'p1', player: 'Player One', ioc: 'SRB' },
      { id: 'p2', player: 'Player Two', ioc: 'ESP' },
    ]);
    // slug rows for enrichment
    (globalThis.prisma!.player!.findMany as any).mockResolvedValueOnce([
      { id: 'p1', slug: 'player-one' },
      { id: 'p2', slug: 'player-two' },
    ]);

    const req = new Request('http://localhost/api?age=38.000&after=1&level=G&round=F');
    const res = await GET(req as any);

    // res is a NextResponse; read its body via .json()
    const body = await res.json();
    // debug
    // eslint-disable-next-line no-console
    console.log('DEBUG atage-rounds (after) body:', body);
    expect(Array.isArray(body)).toBe(true);
    if (!Array.isArray(body)) throw new Error('unexpected response body');

    // Expect p1 chosen age is 38.2 -> count 1 (only the match at 38.2), p2 count 1
    const map = new Map(body.map((r: any) => [r.id, r.appearances_at_age]));
    expect(map.get('p1')).toBe(1);
    expect(map.get('p2')).toBe(1);
  });

  it('for standard (after not set) picks max age <= targetAge and counts only matches at that age', async () => {
    const { GET } = await import('@/app/api/records/atage/rounds/route');

    (globalThis.prisma!.match!.findMany as any).mockResolvedValueOnce([
      { winner_id: 'p1', winner_age: 36.5, loser_id: null, loser_age: null },
      { winner_id: null, winner_age: null, loser_id: 'p1', loser_age: 35.0 },
      { winner_id: 'p2', winner_age: 37.0, loser_id: null, loser_age: null },
    ]);
    (globalThis.prisma!.player!.findMany as any).mockResolvedValueOnce([
      { id: 'p1', player: 'Player One', ioc: 'SRB' },
      { id: 'p2', player: 'Player Two', ioc: 'ESP' },
    ]);    // slug rows for enrichment
    (globalThis.prisma!.player!.findMany as any).mockResolvedValueOnce([
      { id: 'p1', slug: 'player-one' },
      { id: 'p2', slug: 'player-two' },
    ]);
    const req = new Request('http://localhost/api?age=36.000&level=G&round=F');
    const res = await GET(req as any);

    const body = await res.json();
    // if the API errored, surface the returned body for debugging
    if ((res as any).status !== 200) {
      // eslint-disable-next-line no-console
      console.log('DEBUG atage-rounds (normal) status:', (res as any).status);
      // eslint-disable-next-line no-console
      console.log('DEBUG atage-rounds (normal) error body:', body);
      throw new Error(`API returned status ${(res as any).status}: ${JSON.stringify(body)}`);
    }

    // debug
    // eslint-disable-next-line no-console
    console.log('DEBUG atage-rounds (normal) body:', body);
    expect(Array.isArray(body)).toBe(true);
    if (!Array.isArray(body)) throw new Error('unexpected response body');

    const map = new Map(body.map((r: any) => [r.id, r.appearances_at_age]));
    // For p1, ages <= 36 are [35.0] -> max 35 -> count 1
    expect(map.get('p1')).toBe(1);
    // p2 age 37 > 36 -> excluded
    expect(map.has('p2')).toBe(false);
  });
});