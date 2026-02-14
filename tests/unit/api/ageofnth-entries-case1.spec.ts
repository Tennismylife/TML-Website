import { expect, it, describe, beforeEach, vi } from 'vitest';

beforeEach(() => {
  globalThis.prisma = {
    mVEntriesAges: { findMany: vi.fn() },
    player: { findMany: vi.fn(), findUnique: vi.fn() },
    match: { findMany: vi.fn() },
  } as any;
});

describe('GET /api/records/ageofnth/entries CASE1 (MV lookup, level filter)', () => {
  it('returns player when MV contains cumulative counts (age 25.000 cumulative >= 80)', async () => {
    const { GET } = await import('@/app/api/records/ageofnth/entries/route');

    // MV returns a candidate player with cumulative counts
    (globalThis.prisma!.mVEntriesAges!.findMany as any).mockResolvedValueOnce([
      { player_id: 'p1', ages_json: { '24.000': 50, '25.000': 80 }, ages_by_surface_json: {}, ages_by_level_json: { 'G': { '24.000': 50, '25.000': 80 } } }
    ]);

    // players info
    (globalThis.prisma!.player!.findMany as any).mockResolvedValueOnce([
      { id: 'p1', player: 'Player One', ioc: 'ESP' }
    ]);

    // slug rows
    (globalThis.prisma!.player!.findMany as any).mockResolvedValueOnce([
      { id: 'p1', slug: 'player-one' }
    ]);

    const req = new Request('http://localhost/api?n=80&level=G');
    const res = await GET(req as any);
    const body = await res.json();
    expect((res as any).status).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
    const p = body.find((r:any) => r.id === 'p1');
    expect(p).toBeTruthy();
    expect(p.age_at_entry).toBe('25y 0d');
  });

  it('handles MV that exposes per-age histogram by accumulating counts (24.000:50 + 25.000:30 => age 25)', async () => {
    const { GET } = await import('@/app/api/records/ageofnth/entries/route');

    // MV returns per-age histogram (not cumulative)
    (globalThis.prisma!.mVEntriesAges!.findMany as any).mockResolvedValueOnce([
      { player_id: 'p2', ages_json: { '24.000': 50, '25.000': 30 }, ages_by_surface_json: {}, ages_by_level_json: { 'G': { '24.000': 50, '25.000': 30 } } }
    ]);

    // players info
    (globalThis.prisma!.player!.findMany as any).mockResolvedValueOnce([
      { id: 'p2', player: 'Player Two', ioc: 'USA' }
    ]);

    // slug rows
    (globalThis.prisma!.player!.findMany as any).mockResolvedValueOnce([
      { id: 'p2', slug: 'player-two' }
    ]);

    const req = new Request('http://localhost/api?n=80&level=G');
    const res = await GET(req as any);
    const body = await res.json();
    expect((res as any).status).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
    const p = body.find((r:any) => r.id === 'p2');
    expect(p).toBeTruthy();
    expect(p.age_at_entry).toBe('25y 0d');
  });
});