import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  delete (globalThis as any).prisma;
});

function makeMatches(count: number, round: string = 'F') {
  const matches: any[] = [];
  for (let i = 0; i < count; i++) {
    const pid = `p${i}`;
    matches.push({
      id: String(i),
      winner_id: pid,
      winner_name: `Player ${i}`,
      winner_ioc: 'XX',
      winner_age: 20 + (i % 50),
      loser_id: `l${i}`,
      loser_name: `Loser ${i}`,
      loser_ioc: 'YY',
      loser_age: 25 + (i % 40),
      event_id: `e${i}`,
      tourney_id: `T${i}`,
      tourney_name: `Tourney ${i}`,
      year: 2000 + (i % 20),
      round,
      score: '6-4 6-4',
      team_event: false,
      status: true,
      tourney_date: new Date('2000-01-01')
    });
  }
  return matches;
}

describe('Records ages endpoints: limit behavior', () => {
  it('maindraw returns at most 100 when requested larger limit (oldest)', async () => {
    const fakeMatches = makeMatches(300, 'R32');
    const mockPrisma: any = {
      match: {
        findMany: vi.fn().mockResolvedValue(fakeMatches),
      },
      player: {
        findMany: vi.fn().mockResolvedValue(fakeMatches.slice(0, 300).map((m: any, i: number) => ({ id: `p${i}`, player: `Player ${i}`, ioc: 'XX' }))),
      }
    };
    (globalThis as any).prisma = mockPrisma;

    const { GET } = await import('../../app/api/records/ages/maindraw/route');
    const req = new Request('https://example.com/api/records/ages/maindraw?limit=1000&type=oldest');
    const res: any = await GET(req as any);
    const json = await res.json();

    expect(Array.isArray(json.oldestPlayers)).toBe(true);
    expect(json.oldestPlayers.length).toBeLessThanOrEqual(100);
  });

  it('winners returns at most 100 when requested larger limit (oldestWinners)', async () => {
    const fakeMatches = makeMatches(300, 'F');
    const mockPrisma: any = {
      match: {
        findMany: vi.fn().mockResolvedValue(fakeMatches),
      },
      player: {
        findMany: vi.fn().mockResolvedValue(fakeMatches.slice(0, 300).map((m: any, i: number) => ({ id: `p${i}`, player: `Player ${i}`, ioc: 'XX', slug: `player-${i}` }))),
      }
    };
    (globalThis as any).prisma = mockPrisma;

    const { GET } = await import('../../app/api/records/ages/winners/route');
    const req = new Request('https://example.com/api/records/ages/winners?limit=1000&type=oldest');
    const res: any = await GET(req as any);
    const json = await res.json();

    expect(Array.isArray(json.oldestWinners)).toBe(true);
    expect(json.oldestWinners.length).toBeLessThanOrEqual(100);
  });

  it('maindraw returns at most 100 for youngest', async () => {
    const fakeMatches = makeMatches(250, 'R16');
    const mockPrisma: any = {
      match: { findMany: vi.fn().mockResolvedValue(fakeMatches) },
      player: { findMany: vi.fn().mockResolvedValue(fakeMatches.slice(0, 250).map((m: any,i:number) => ({ id: `p${i}`, player: `Player ${i}`, ioc: 'XX' })) ) }
    };
    (globalThis as any).prisma = mockPrisma;

    const { GET } = await import('../../app/api/records/ages/maindraw/route');
    const req = new Request('https://example.com/api/records/ages/maindraw?limit=1000&type=youngest');
    const res: any = await GET(req as any);
    const json = await res.json();

    expect(Array.isArray(json.youngestPlayers)).toBe(true);
    expect(json.youngestPlayers.length).toBeLessThanOrEqual(100);
  });

  it('winners returns at most 100 for youngestWinners', async () => {
    const fakeMatches = makeMatches(220, 'F');
    const mockPrisma: any = {
      match: { findMany: vi.fn().mockResolvedValue(fakeMatches) },
      player: { findMany: vi.fn().mockResolvedValue(fakeMatches.slice(0,220).map((m:any,i:number)=>({ id:`p${i}`, player:`Player ${i}`, ioc:'XX', slug:`player-${i}`})) ) }
    };
    (globalThis as any).prisma = mockPrisma;

    const { GET } = await import('../../app/api/records/ages/winners/route');
    const req = new Request('https://example.com/api/records/ages/winners?limit=1000&type=youngest');
    const res: any = await GET(req as any);
    const json = await res.json();

    expect(Array.isArray(json.youngestWinners)).toBe(true);
    expect(json.youngestWinners.length).toBeLessThanOrEqual(100);
  });
});
