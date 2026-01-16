import { describe, it, expect, vi } from 'vitest';
import { getSitemapUrls, generateSitemapXml } from '@/lib/sitemap';

// Mock prisma to keep sitemap tests deterministic and fast
vi.mock('@/lib/prisma', () => ({
  prisma: {
    match: {
      aggregate: vi.fn(async () => ({ _max: { tourney_date: null } })),
      groupBy: vi.fn(async () => []),
      findMany: vi.fn(async () => []),
    },
    player: { findMany: vi.fn(async () => []) },
    tournament: { findMany: vi.fn(async () => []) },
  },
}));

describe('sitemap generator', () => {
  it('returns basic URL list', async () => {
    const urls = await getSitemapUrls();
    expect(Array.isArray(urls)).toBe(true);
    expect(urls).toContain('/');

    // Records links that should be included without filters
    expect(urls).toContain('/records/same/wins');
    expect(urls).toContain('/records/same/played');
    expect(urls).toContain('/records/titles');
    expect(urls).toContain('/records/ages/oldest');
  }, 20000);

  it('generates valid XML', async () => {
    const xml = await generateSitemapXml();
    expect(xml).toContain('<?xml');
    expect(xml).toContain('<urlset');
  });
});