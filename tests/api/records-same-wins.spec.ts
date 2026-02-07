import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  delete (globalThis as any).prisma;
});

describe('records same wins API', () => {
  it('attaches tourney_slug when tournament id is numeric or composite', async () => {
    const fakeWins = [
      { tourney_id: '520', tourney_name: 'Roland Garros', player_id: 'p1', player_name: 'Player One', total_wins: 3, round: null, best_of: null, surface: null, tourney_level: null, ioc: 'FRA' }
    ];

    const mockPrisma: any = {
      mVSameTournamentWins: { findMany: vi.fn().mockResolvedValue(fakeWins) },
      player: { findMany: vi.fn().mockResolvedValue([{ id: 'p1', slug: 'player-one' }]) },
      tournament: { findMany: vi.fn().mockResolvedValue([{ id: 520, slug: 'roland-garros' }]) }
    };

    (globalThis as any).prisma = mockPrisma;

    const { GET } = await import('../../app/api/records/same/wins/route');
    const req = new Request('https://example.com/api/records/same/wins?limit=100&type=oldest');
    const res: any = await GET(req as any);
    const json = await res.json();

    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);
    expect(json[0].tourney_slug).toBe('roland-garros');
  });
});