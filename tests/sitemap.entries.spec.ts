import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma used by lib/sitemap
vi.mock('@/lib/prisma', () => {
  const match = {
    aggregate: vi.fn((args: any) => {
      // global max (no where)
      if (!args?.where) return { _max: { tourney_date: '2026-01-10T00:00:00.000Z' } };
      // edition aggregate
      if (args?.where?.tourney_id) return { _count: { _all: 5 }, _max: { tourney_date: '2025-06-01T00:00:00.000Z' } };
      return { _max: {} };
    }),
    groupBy: vi.fn((args: any) => {
      if (Array.isArray(args.by) && args.by.includes('winner_id')) {
        return [{ winner_id: 'p1', _count: { _all: 3 }, _max: { tourney_date: '2026-01-12T00:00:00.000Z' } }];
      }
      if (Array.isArray(args.by) && args.by.includes('loser_id')) {
        return [];
      }
      if (Array.isArray(args.by) && args.by.includes('tourney_id')) {
        return [{ tourney_id: '1', _count: { _all: 10 }, _max: { tourney_date: '2026-01-01T00:00:00.000Z' } }];
      }
      return [];
    }),
    findMany: vi.fn((args: any) => {
      // editions distinct call
      if (args?.distinct) return [{ tourney_id: '1', year: 2025 }];
      return [];
    }),
  } as any;

  const player = {
    findMany: vi.fn(() => [{ id: 'p1', slug: 'player-one' }]),
  } as any;

  const tournament = {
    findMany: vi.fn(() => [{ id: 1, slug: 'aus-open', endDate: '2025-01-01T00:00:00.000Z' }]),
  } as any;

  return { prisma: { match, player, tournament } };
});

import { getSitemapEntries, generateSitemapXml } from '@/lib/sitemap';

describe('sitemap entries and xml', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('getSitemapEntries includes lastmod and popularity for players and records', async () => {
    const entries = await getSitemapEntries();
    const playerEntry = entries.find(e => e.path === '/players/player-one');
    expect(playerEntry).toBeDefined();
    expect(playerEntry?.popularity).toBeGreaterThanOrEqual(3);
    expect(playerEntry?.lastmod).toBe('2026-01-12');

    const recordEntry = entries.find(e => e.path === '/records/same/wins');
    // records should have lastmod equal to global max
    expect(recordEntry).toBeDefined();
    expect(recordEntry?.lastmod).toBe('2026-01-10');
  });

  it('generateSitemapXml writes <lastmod> and records priority = 1.00', async () => {
    const xml = await generateSitemapXml();
    // dump xml for debugging
    // eslint-disable-next-line no-console
    console.log('SITEMAP XML:\n', xml);

    // player lastmod
    expect(xml).toContain('<lastmod>2026-01-12</lastmod>');
    // records lastmod
    expect(xml).toContain('<lastmod>2026-01-10</lastmod>');

    // records priority must be 1.00 somewhere
    expect(xml).toContain('<priority>1.00</priority>');

    // specifically ensure tournament-specific record page has priority 1.00
    const loc = `<loc>https://stats.tennismylife.org/tournaments/aus-open/records/count/wins</loc>`;
    const idx = xml.indexOf(loc);
    expect(idx).toBeGreaterThanOrEqual(0);
    const slice = xml.slice(idx, idx + 400);
    expect(slice).toContain('<priority>1.00</priority>');

    // additionally check changefreq rules
    // player should be daily (lastmod 2026-01-12 => within 7 days)
    const playerLoc = `<loc>https://stats.tennismylife.org/players/player-one</loc>`;
    const pidx = xml.indexOf(playerLoc);
    expect(pidx).toBeGreaterThanOrEqual(0);
    const pslice = xml.slice(pidx, pidx + 200);
    expect(pslice).toContain('<changefreq>daily</changefreq>');

    // tournament overview should be weekly (lastmod 2026-01-01 => within 30 days => weekly)
    const tourLoc = `<loc>https://stats.tennismylife.org/tournaments/aus-open</loc>`;
    const tidx = xml.indexOf(tourLoc);
    expect(tidx).toBeGreaterThanOrEqual(0);
    const tslice = xml.slice(tidx, tidx + 200);
    expect(tslice).toContain('<changefreq>weekly</changefreq>');
  });
});
