import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock jiti to return a prisma client with expected groupBy/findMany behavior
vi.mock('jiti', () => (filename: string) => {
  return (modulePath: string) => ({
    prisma: {
      player: {
        findMany: vi.fn(async () => [{ id: 'p1', slug: 'player-one' }, { id: 'p2', slug: 'player-two' }]),
      },
      match: {
        groupBy: vi.fn(async (args: any) => {
          // wins by player-year
          if (Array.isArray(args.by) && args.by.includes('winner_id') && args.by.includes('year')) {
            return [{ winner_id: 'p1', year: 2025, _count: { _all: 120 }, _max: { tourney_date: '2025-06-01T00:00:00.000Z' } }, { winner_id: 'p2', year: 2024, _count: { _all: 40 }, _max: { tourney_date: '2024-05-01T00:00:00.000Z' } }];
          }
          // losses by player-year
          if (Array.isArray(args.by) && args.by.includes('loser_id') && args.by.includes('year')) {
            return [{ loser_id: 'p1', year: 2025, _count: { _all: 10 }, _max: { tourney_date: '2025-06-02T00:00:00.000Z' } }, { loser_id: 'p2', year: 2024, _count: { _all: 30 }, _max: { tourney_date: '2024-05-02T00:00:00.000Z' } }];
          }
          return [];
        }),
      },
    },
  });
});

import { generatePlayerSeasonsXml } from '../../scripts/sitemap/generate-sitemap-player-seasons';

describe('generate-sitemap-player-seasons', () => {
  beforeEach(() => vi.resetAllMocks());

  it('produces XML containing season URLs with lastmod tags', async () => {
    const xml = await generatePlayerSeasonsXml();
    expect(xml).toContain('<loc>https://stats.tennismylife.org/players/player-one/season/2025</loc>');
    expect(xml).toContain('<lastmod>2025-06-01</lastmod>');
    expect(xml).toContain('<loc>https://stats.tennismylife.org/players/player-two/season/2024</loc>');
  });
});
