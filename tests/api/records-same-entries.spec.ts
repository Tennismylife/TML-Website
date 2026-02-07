import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  delete (globalThis as any).prisma;
});

describe('records same entries API', () => {
  it('attaches tourney_slug and player slug when available', async () => {
    const fake = [
      { tourney_id: '520', tourney_name: 'Roland Garros', player_id: 'p1', player_name: 'Player One', total_entries: 5, surface: null, tourney_level: null }
    ];

    const mockPrisma: any = {
      mVSameTournamentEntries: { findMany: vi.fn().mockResolvedValue(fake) },
      player: { findMany: vi.fn().mockResolvedValue([{ id: 'p1', slug: 'player-one' }]) },
      tournament: { findMany: vi.fn().mockResolvedValue([{ id: 520, slug: 'roland-garros' }]) }
    };

    (globalThis as any).prisma = mockPrisma;

    const { GET } = await import('../../app/api/records/same/entries/route');
    const req = new Request('https://example.com/api/records/same/entries?limit=100');
    const res: any = await GET(req as any);
    const json = await res.json();

    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);
    expect(json[0].tourney_slug).toBe('roland-garros');
    expect(json[0].slug).toBe('player-one');
  });
});