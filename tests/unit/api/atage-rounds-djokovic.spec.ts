import { expect, it, describe, beforeEach, vi } from 'vitest';

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

describe('GET /api/records/atage/round (Djokovic case)', () => {
  it('returns Djokovic when he appears as loser with age > 38 and after=1', async () => {
    const { GET } = await import('@/app/api/records/atage/rounds/route');

    // Simulate a match where Djokovic is the loser with age 38.2 in round F
    (globalThis.prisma!.match!.findMany as any).mockResolvedValueOnce([
      { winner_id: 'someone', winner_age: 30.0, loser_id: 'djokovic', loser_age: 38.2 },
    ]);

    // player info
    (globalThis.prisma!.player!.findMany as any).mockResolvedValueOnce([
      { id: 'djokovic', player: 'Novak Djokovic', ioc: 'SRB' },
    ]);
    // slug rows
    (globalThis.prisma!.player!.findMany as any).mockResolvedValueOnce([
      { id: 'djokovic', slug: 'novak-djokovic' },
    ]);

    const req = new Request('http://localhost/api?age=38.000&after=1&level=G&round=F');
    const res = await GET(req as any);

    expect((res as any).status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    const map = new Map(body.map((r: any) => [r.id, r]));
    const row = map.get('djokovic');
    expect(row).toBeDefined();
    expect(row.name).toMatch(/Djokovic/i);
    expect(row.appearances_at_age).toBeGreaterThanOrEqual(1);
    expect(row.slug).toBe('novak-djokovic');
  });
});