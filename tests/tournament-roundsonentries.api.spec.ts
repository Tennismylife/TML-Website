import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/tournament', () => ({ resolveTourneyIds: () => ['580', '581'] }));

describe('Tournament roundsonentries', () => {
  beforeEach(() => {
    vi.resetModules();
    delete (globalThis as any).prisma;
  });

  it('counts unique event_id per player and per round (no >100%)', async () => {
    const fakeMatches = [
      // same year but different event_ids (two editions in same year)
      { year: 1977, event_id: '1977-580', round: 'R32', winner_id: 'R075', winner_name: 'Ken Rosewall', winner_ioc: 'AUS', loser_id: 'X1', loser_name: 'Opp', loser_ioc: 'AUS', tourney_date: new Date('1977-01-02') },
      { year: 1977, event_id: '1977-581', round: 'R32', winner_id: 'R075', winner_name: 'Ken Rosewall', winner_ioc: 'AUS', loser_id: 'X2', loser_name: 'Opp2', loser_ioc: 'AUS', tourney_date: new Date('1977-12-20') },
    ];

    const mockPrisma: any = {
      match: {
        findMany: vi.fn().mockResolvedValue(fakeMatches),
      },
    };

    (globalThis as any).prisma = mockPrisma;

    const { GET } = await import('../app/api/tournaments/[id]/records/roundsonentries/route');
    const req = new Request('https://example.com/api/tournaments/australian-open/records/roundsonentries');
    const res: any = await GET(req as any, { params: { id: 'australian-open' } } as any);
    const json = await res.json();

    // find R32 list and Ken
    const r32 = json.allRoundItems.find((it: any) => it.title === 'R32');
    const ken = r32.fullList.find((p: any) => p.id === 'R075');

    expect(ken.totalEntries).toBe(2); // two distinct event_ids
    expect(ken.reaches).toBe(2); // one reach per event
    expect(ken.percentage).toBeLessThanOrEqual(100);
  });
});