import { describe, it, expect } from 'vitest';
import { getSitemapUrls, generateSitemapXml } from '@/lib/sitemap';

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
  });

  it('generates valid XML', async () => {
    const xml = await generateSitemapXml();
    expect(xml).toContain('<?xml');
    expect(xml).toContain('<urlset');
  });
});