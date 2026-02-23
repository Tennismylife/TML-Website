import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../lib/prisma';
import { getYoungestTop, getOldestTop, AgeRecord } from '../../lib/recordsranking';

// make sure the prisma client exposes the methods we will spy on
vi.mock('@/lib/prisma', () => ({ prisma: { $queryRaw: vi.fn(), $queryRawUnsafe: vi.fn() } }));

describe('recordsranking helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (prisma as any).$queryRaw = vi.fn();
    (prisma as any).$queryRawUnsafe = vi.fn();
  });

  const sampleRow = {
    player_id: 'foo',
    atpname: 'Foo Bar',
    ioc: 'USA',
    birthdate: new Date('2000-01-01'),
    date: new Date('2010-01-01'),
    age_days: 3650,
  };

  it('returns formatted records from raw rows and clamps limit', async () => {
    const spy = vi.spyOn(prisma, '$queryRawUnsafe').mockResolvedValueOnce([sampleRow] as any);
    const results = await getYoungestTop(5, 500); // limit above 100 should be clamped

    expect(results).toHaveLength(1);
    const rec = results[0];
    expect(rec).toEqual({
      id: 'foo',
      name: 'Foo Bar',
      ioc: 'USA',
      ageDays: 3650,
      ageLabel: expect.stringContaining('y'),
      date: '2010-01-01',
    });

    expect(spy).toHaveBeenCalled();
    const [[sqlString]] = spy.mock.calls as any;
    expect(typeof sqlString).toBe('string');
    expect(sqlString).toMatch(/r\.rank\s*<=/);
    expect(sqlString).toMatch(/limit/);
  });

  it('throws for invalid top values', async () => {
    await expect(getYoungestTop(0)).rejects.toThrow();
    await expect(getYoungestTop(-3)).rejects.toThrow();
    await expect(getOldestTop(0)).rejects.toThrow();
  });

  it('passes correct direction flag for oldest', async () => {
    const spy = vi.spyOn(prisma, '$queryRawUnsafe').mockResolvedValueOnce([sampleRow] as any);
    await getOldestTop(10, 1);
    expect(spy).toHaveBeenCalled();
    const [[sqlString]] = spy.mock.calls as any;
    expect(sqlString).toMatch(/order by age_days desc/);
  });
});
