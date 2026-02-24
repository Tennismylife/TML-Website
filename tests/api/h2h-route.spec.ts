import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  delete (globalThis as any).prisma;
});

describe('API /api/h2h route', () => {
  it('filters by best_of when provided', async () => {
    const fakeMatches = [
      { id: 1, winner_id: 'p1', loser_id: 'p2', best_of: 3 },
      { id: 2, winner_id: 'p2', loser_id: 'p1', best_of: 5 },
      { id: 3, winner_id: 'p1', loser_id: 'p2', best_of: 3 },
    ];

    const mockPrisma: any = {
      match: { findMany: vi.fn().mockResolvedValue(fakeMatches) },
    };

    (globalThis as any).prisma = mockPrisma;

    const { GET } = await import('../../app/api/h2h/route');
    const req = new Request('https://example.com/api/h2h?player1=p1&player2=p2&best_of=3');
    const res: any = await GET(req as any);
    const json = await res.json();

    // Our route should have applied the filter; since prisma.match.findMany is mocked
    // to always return fakeMatches we assert that the caller constructed the WHERE
    // correctly by checking the mock call arguments.
    expect(mockPrisma.match.findMany).toHaveBeenCalled();
    const callArgs = mockPrisma.match.findMany.mock.calls[0][0] as any;
    expect(callArgs.where.best_of).toBe(3);

    // And the response should be the mocked array (route doesn't post-filter)
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBe(3);
  });

  it('does not add best_of filter when value is All or absent', async () => {
    const fakeMatches = [
      { id: 1, winner_id: 'p1', loser_id: 'p2', best_of: 3 },
      { id: 2, winner_id: 'p2', loser_id: 'p1', best_of: 5 },
    ];

    const mockPrisma: any = {
      match: { findMany: vi.fn().mockResolvedValue(fakeMatches) },
    };

    (globalThis as any).prisma = mockPrisma;

    const { GET } = await import('../../app/api/h2h/route');
    const req = new Request('https://example.com/api/h2h?player1=p1&player2=p2&best_of=All');
    const res: any = await GET(req as any);
    const json = await res.json();

    expect(mockPrisma.match.findMany).toHaveBeenCalled();
    const callArgs = mockPrisma.match.findMany.mock.calls[0][0] as any;
    expect(callArgs.where.best_of).toBeUndefined();
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBe(2);
  });
});