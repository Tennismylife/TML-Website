import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getYoungestRoute } from '@/app/api/recordsranking/ages/youngesttop/route';
import { GET as getOldestRoute } from '@/app/api/recordsranking/ages/oldesttop/route';
import { prisma } from '@/lib/prisma';

// One flat MV row mimicking what Postgres returns
const mvRow50Youngest = {
  player_id: 1,
  rank: 1,
  atpname: 'Youngest Player',
  ioc: 'ITA',
  birthdate: new Date('2000-01-01'),
  date: new Date('2018-06-15'),
  age_days: 6375,
};
const mvRow100Youngest = {
  player_id: 2,
  rank: 50,
  atpname: 'Second Youngest',
  ioc: 'ESP',
  birthdate: new Date('1999-03-10'),
  date: new Date('2019-01-20'),
  age_days: 7230,
};
const mvRow50Oldest = {
  player_id: 3,
  rank: 1,
  atpname: 'Oldest Player',
  ioc: 'USA',
  birthdate: new Date('1970-05-20'),
  date: new Date('2010-08-01'),
  age_days: 14682,
};
const mvRow100Oldest = {
  player_id: 4,
  rank: 80,
  atpname: 'Second Oldest',
  ioc: 'GBR',
  birthdate: new Date('1968-11-11'),
  date: new Date('2005-04-03'),
  age_days: 13294,
};

// Build a prisma mock that exposes MV models when requested
function makePrismaMock(opts: {
  withMVYoungest50?: boolean;
  withMVYoungest100?: boolean;
  withMVOldest50?: boolean;
  withMVOldest100?: boolean;
} = {}) {
  const mock: any = {
    ranking: { findMany: vi.fn().mockResolvedValue([]) },
  };
  if (opts.withMVYoungest50)  mock.mv_ages_youngesttop_50  = { findMany: vi.fn().mockResolvedValue([mvRow50Youngest]) };
  if (opts.withMVYoungest100) mock.mv_ages_youngesttop_100 = { findMany: vi.fn().mockResolvedValue([mvRow100Youngest]) };
  if (opts.withMVOldest50)    mock.mv_ages_oldesttop_50    = { findMany: vi.fn().mockResolvedValue([mvRow50Oldest]) };
  if (opts.withMVOldest100)   mock.mv_ages_oldesttop_100   = { findMany: vi.fn().mockResolvedValue([mvRow100Oldest]) };
  return mock;
}

vi.mock('@/lib/prisma', () => ({
  prisma: { ranking: { findMany: vi.fn() } },
}));

function makeReq(qs: string) {
  return new Request(`https://example.com${qs}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// YOUNGEST TOP — MV path
// ─────────────────────────────────────────────────────────────────────────────
describe('youngesttop — MV path for top=50 and top=100', () => {
  it('calls mv_ages_youngesttop_100 (not ranking.findMany) when top=100', async () => {
    const mock = makePrismaMock({ withMVYoungest100: true });
    Object.assign(prisma, mock);

    await getYoungestRoute(makeReq('?top=100'));

    expect(mock.mv_ages_youngesttop_100.findMany).toHaveBeenCalledOnce();
    expect(prisma.ranking.findMany).not.toHaveBeenCalled();
  });

  it('calls mv_ages_youngesttop_50 (not ranking.findMany) when top=50', async () => {
    const mock = makePrismaMock({ withMVYoungest50: true });
    Object.assign(prisma, mock);

    await getYoungestRoute(makeReq('?top=50'));

    expect(mock.mv_ages_youngesttop_50.findMany).toHaveBeenCalledOnce();
    expect(prisma.ranking.findMany).not.toHaveBeenCalled();
  });

  it('MV top=100 result is mapped to correct output shape', async () => {
    const mock = makePrismaMock({ withMVYoungest100: true });
    Object.assign(prisma, mock);

    const res = await getYoungestRoute(makeReq('?top=100'));
    const body = await res.json();

    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      id:      String(mvRow100Youngest.player_id),
      name:    mvRow100Youngest.atpname,
      ioc:     mvRow100Youngest.ioc,
      ageDays: mvRow100Youngest.age_days,
    });
    expect(body[0].ageLabel).toMatch(/^\d+y \d+m \d+d$/);
    expect(body[0].date).toBe(mvRow100Youngest.date.toISOString().slice(0, 10));
  });

  it('MV top=50 result is mapped to correct output shape', async () => {
    const mock = makePrismaMock({ withMVYoungest50: true });
    Object.assign(prisma, mock);

    const res = await getYoungestRoute(makeReq('?top=50'));
    const body = await res.json();

    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      id:      String(mvRow50Youngest.player_id),
      name:    mvRow50Youngest.atpname,
      ageDays: mvRow50Youngest.age_days,
    });
  });

  it('falls back to ranking.findMany when MV model is absent (top=100)', async () => {
    // reset to base mock — no MV properties
    (prisma as any).mv_ages_youngesttop_100 = undefined;
    (prisma as any).mv_ages_youngesttop_50  = undefined;
    (prisma.ranking.findMany as any).mockResolvedValue([]);

    await getYoungestRoute(makeReq('?top=100'));

    expect(prisma.ranking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { rank: { lte: 100 } } })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// OLDEST TOP — MV path
// ─────────────────────────────────────────────────────────────────────────────
describe('oldesttop — MV path for top=50 and top=100', () => {
  beforeEach(() => {
    (prisma as any).mv_ages_oldesttop_100 = undefined;
    (prisma as any).mv_ages_oldesttop_50  = undefined;
    vi.clearAllMocks();
  });

  it('calls mv_ages_oldesttop_100 (not ranking.findMany) when top=100', async () => {
    const mock = makePrismaMock({ withMVOldest100: true });
    Object.assign(prisma, mock);

    await getOldestRoute(makeReq('?top=100'));

    expect(mock.mv_ages_oldesttop_100.findMany).toHaveBeenCalledOnce();
    expect(prisma.ranking.findMany).not.toHaveBeenCalled();
  });

  it('calls mv_ages_oldesttop_50 (not ranking.findMany) when top=50', async () => {
    const mock = makePrismaMock({ withMVOldest50: true });
    Object.assign(prisma, mock);

    await getOldestRoute(makeReq('?top=50'));

    expect(mock.mv_ages_oldesttop_50.findMany).toHaveBeenCalledOnce();
    expect(prisma.ranking.findMany).not.toHaveBeenCalled();
  });

  it('MV top=100 result is mapped to correct output shape', async () => {
    const mock = makePrismaMock({ withMVOldest100: true });
    Object.assign(prisma, mock);

    const res = await getOldestRoute(makeReq('?top=100'));
    const body = await res.json();

    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      id:      String(mvRow100Oldest.player_id),
      name:    mvRow100Oldest.atpname,
      ioc:     mvRow100Oldest.ioc,
      ageDays: mvRow100Oldest.age_days,
    });
    expect(body[0].ageLabel).toMatch(/^\d+y \d+m \d+d$/);
    expect(body[0].date).toBe(mvRow100Oldest.date.toISOString().slice(0, 10));
  });

  it('MV top=50 result is mapped to correct output shape', async () => {
    const mock = makePrismaMock({ withMVOldest50: true });
    Object.assign(prisma, mock);

    const res = await getOldestRoute(makeReq('?top=50'));
    const body = await res.json();

    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      id:      String(mvRow50Oldest.player_id),
      name:    mvRow50Oldest.atpname,
      ageDays: mvRow50Oldest.age_days,
    });
  });

  it('falls back to ranking.findMany when MV model is absent (top=100)', async () => {
    (prisma as any).mv_ages_oldesttop_100 = undefined;
    (prisma as any).mv_ages_oldesttop_50  = undefined;
    (prisma.ranking.findMany as any).mockResolvedValue([]);

    await getOldestRoute(makeReq('?top=100'));

    expect(prisma.ranking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { rank: { lte: 100 } } })
    );
  });
});
