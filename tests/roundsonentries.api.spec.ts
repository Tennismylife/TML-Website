import { describe, it, expect, vi, beforeEach } from 'vitest';

/** Test per assicurare che venga contata una sola entry per event_id */

describe('API /records/roundsonentries/rounds', () => {
  beforeEach(() => {
    vi.resetModules();
    delete (globalThis as any).prisma;
  });

  it('counts one entry per event_id even when duplicates are present', async () => {
    // Mock prisma with duplicate pairs in the first groupBy call
    const mockPrisma: any = {
      playerTournament: {
        groupBy: vi.fn()
          .mockResolvedValueOnce([
            // entries (duplicated pair for p1,e1)
            { player_id: 'p1', event_id: 'e1' },
            { player_id: 'p1', event_id: 'e1' },
            { player_id: 'p1', event_id: 'e2' },
            { player_id: 'p2', event_id: 'e1' },
          ])
          .mockResolvedValueOnce([
            // rounds (wins) - unique pairs
            { player_id: 'p1', event_id: 'e1' },
            { player_id: 'p1', event_id: 'e2' },
          ]),
      },
      player: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'p1', atpname: 'Player One', ioc: 'USA', slug: 'player-one' },
          { id: 'p2', atpname: 'Player Two', ioc: 'GBR', slug: 'player-two' },
        ]),
      },
    };

    (globalThis as any).prisma = mockPrisma;

    const { GET } = await import('../app/api/records/roundsonentries/rounds/route');

    const req = new Request('https://example.com/api/rounds?round=SF');
    const res: any = await GET(req as any);
    const json = await res.json();

    const p1 = json.FinalWins.find((x: any) => x.id === 'p1');
    const p2 = json.FinalWins.find((x: any) => x.id === 'p2');

    // p1 has event e1 and e2 => entries should be 2 despite duplicate e1 rows
    expect(p1.entries).toBe(2);
    // p2 has only e1 => entries should be 1
    expect(p2.entries).toBe(1);
  });
});