/** @vitest-environment node */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    mVStats: { groupBy: vi.fn() },
    match: { groupBy: vi.fn() },
    player: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/player-slugs', () => ({
  mapIdsToSlugs: vi.fn().mockResolvedValue({ '10': 'john-isner' }),
}));

import { GET as GET_avg } from '../../app/api/statistics/avgminutes/route';
import { GET as GET_setswon } from '../../app/api/statistics/setswon/route';
import { GET as GET_tbplayed } from '../../app/api/statistics/tiebreaksplayed/route';
import { GET as GET_totalgames } from '../../app/api/statistics/totalgames/route';
import { GET as GET_bpsaved } from '../../app/api/statistics/bpsaved/route';
import { prisma } from '@/lib/prisma';

const mockedPrisma = prisma as any;

beforeEach(() => vi.resetAllMocks());

describe('statistics endpoints slug enrichment', () => {
  it('avgminutes includes slug', async () => {
    // winners and losers contribute to player id '10'
    mockedPrisma.match.groupBy.mockResolvedValueOnce([{ winner_id: '10', winner_name: 'John Isner', winner_ioc: 'USA', _count: { winner_id: 1 }, _sum: { minutes: 120 } }]);
    mockedPrisma.match.groupBy.mockResolvedValueOnce([]);
    mockedPrisma.player.findMany.mockResolvedValue([{ id: '10', atpname: 'John Isner', ioc: 'USA' }]);

    const res: any = await GET_avg({ url: 'http://localhost/api/statistics/avgminutes' } as any);
    const body = await res.json();

    expect(Array.isArray(body)).toBe(true);
    expect(body[0].slug).toBe('john-isner');
  });

  it('setswon includes slug', async () => {
    mockedPrisma.mVStats.groupBy.mockResolvedValueOnce([{ winner_id: 10, _count: { winner_id: 1 }, _sum: { w_setsWon: 3 } }]);
    mockedPrisma.mVStats.groupBy.mockResolvedValueOnce([]);
    mockedPrisma.player.findMany.mockResolvedValue([{ id: '10', atpname: 'John Isner', ioc: 'USA' }]);

    const res: any = await GET_setswon({ url: 'http://localhost/api/statistics/setswon' } as any);
    const body = await res.json();

    expect(Array.isArray(body)).toBe(true);
    expect(body[0].slug).toBe('john-isner');
  });

  it('tiebreaksplayed includes slug', async () => {
    mockedPrisma.mVStats.groupBy.mockResolvedValueOnce([{ winner_id: 10, _count: { winner_id: 1 }, _sum: { w_tbWon: 1, l_tbWon: 0 } }]);
    mockedPrisma.mVStats.groupBy.mockResolvedValueOnce([]);
    mockedPrisma.player.findMany.mockResolvedValue([{ id: '10', atpname: 'John Isner', ioc: 'USA' }]);

    const res: any = await GET_tbplayed({ url: 'http://localhost/api/statistics/tiebreaksplayed' } as any);
    const body = await res.json();

    expect(Array.isArray(body)).toBe(true);
    expect(body[0].slug).toBe('john-isner');
  });

  it('totalgames includes slug', async () => {
    mockedPrisma.mVStats.groupBy.mockResolvedValueOnce([{ winner_id: 10, _count: { winner_id: 1 }, _sum: { w_gmsWon: 10 } }]);
    mockedPrisma.mVStats.groupBy.mockResolvedValueOnce([]);
    mockedPrisma.player.findMany.mockResolvedValue([{ id: '10', atpname: 'John Isner', ioc: 'USA' }]);

    const res: any = await GET_totalgames({ url: 'http://localhost/api/statistics/totalgames' } as any);
    const body = await res.json();

    expect(Array.isArray(body)).toBe(true);
    expect(body[0].slug).toBe('john-isner');
  });

  it('bpsaved includes slug', async () => {
    mockedPrisma.match.groupBy.mockResolvedValueOnce([{ winner_id: '10', winner_name: 'John Isner', winner_ioc: 'USA', _count: { winner_id: 1 }, _sum: { w_bpSaved: 2, w_bpFaced: 3 } }]);
    mockedPrisma.match.groupBy.mockResolvedValueOnce([]);
    mockedPrisma.player.findMany.mockResolvedValue([{ id: '10', atpname: 'John Isner', ioc: 'USA' }]);

    const res: any = await GET_bpsaved({ url: 'http://localhost/api/statistics/bpsaved' } as any);
    const body = await res.json();

    expect(Array.isArray(body)).toBe(true);
    expect(body[0].slug).toBe('john-isner');
  });
});
