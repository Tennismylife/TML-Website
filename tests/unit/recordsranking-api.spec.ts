import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getYoungestRoute } from '@/app/api/recordsranking/ages/youngesttop/route';
import { GET as getOldestRoute } from '@/app/api/recordsranking/ages/oldesttop/route';
import { getYoungestTop, getOldestTop } from '../../lib/recordsranking';

// mock helper functions so we don't hit the database
vi.mock('@/lib/recordsranking', () => ({
  getYoungestTop: vi.fn(),
  getOldestTop: vi.fn(),
}));

describe('recordsranking age routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('youngesttop returns data from helper and clamps limit', async () => {
    const fakeData = [{ id: '1', name: 'A', ioc: null, ageDays: 1, ageLabel: '1y 0m 0d', date: '2000-01-01' }];
    (getYoungestTop as any).mockResolvedValueOnce(fakeData);

    const req = new Request('https://x/recordsranking/ages/youngesttop?top=10&limit=50');
    const res: any = await getYoungestRoute(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual(fakeData);
    expect(getYoungestTop).toHaveBeenCalledWith(10, 50);
  });

  it('youngesttop rejects invalid top', async () => {
    const req = new Request('https://x/recordsranking/ages/youngesttop?top=0');
    const res: any = await getYoungestRoute(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty('error');
  });

  it('oldesttop forwards to helper', async () => {
    const fakeData = [{ id: '2', name: 'B', ioc: 'FRA', ageDays: 9000, ageLabel: '24y', date: '1990-01-01' }];
    (getOldestTop as any).mockResolvedValueOnce(fakeData);

    const req = new Request('https://x/recordsranking/ages/oldesttop?top=20');
    const res: any = await getOldestRoute(req);
    const json = await res.json();

    expect(json).toEqual(fakeData);
    expect(getOldestTop).toHaveBeenCalledWith(20, 100); // default/clamped
  });
});
