import { getCountSection } from '@/lib/records/count';
import { vi } from 'vitest';

vi.mock('@/lib/player-slugs', () => ({
  mapIdsToSlugs: vi.fn().mockResolvedValue({ '10': 'john-isner', '20': 'novak-djokovic' })
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    match: {
      findMany: vi.fn().mockResolvedValue([
        // titles: winner_id 10 twice, 20 once
        { round: 'F', winner_id: 10, winner_name: 'John Isner', winner_ioc: 'USA', year: 2007 },
        { round: 'F', winner_id: 10, winner_name: 'John Isner', winner_ioc: 'USA', year: 2008 },
        { round: 'F', winner_id: 20, winner_name: 'Novak Djokovic', winner_ioc: 'SRB', year: 2009 },
        // wins/played entries
        { status: true, winner_id: 10, winner_name: 'John Isner', winner_ioc: 'USA' },
        { status: true, winner_id: 20, winner_name: 'Novak Djokovic', winner_ioc: 'SRB' },
        { status: true, loser_id: 10, loser_name: 'John Isner', loser_ioc: 'USA' },
      ])
    }
  }
}));

describe('getCountSection slug enrichment', () => {
  it('attaches slug fields to titles list', async () => {
    const res = await getCountSection('123', 'titles');
    expect(Array.isArray(res)).toBe(true);
    const ids = res.map(r => String(r.id));
    expect(ids).toContain('10');
    const item = res.find(r => String(r.id) === '10');
    expect(item).toBeDefined();
    expect(item.slug).toBe('john-isner');
  });

  it('attaches slug fields to wins/played/entries lists', async () => {
    for (const s of ['wins', 'played', 'entries'] as const) {
      const res = await getCountSection('123', s);
      expect(Array.isArray(res)).toBe(true);
      const item = res.find(r => String(r.id) === '20');
      if (item) expect(item.slug).toBe('novak-djokovic');
    }
  });
});