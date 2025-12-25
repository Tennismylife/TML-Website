import { describe, it, expect } from 'vitest';
import { getSitemapUrls, generateSitemapXml } from '@/lib/sitemap';

describe('sitemap generator', () => {
  it('returns basic URL list', async () => {
    const urls = await getSitemapUrls();
    expect(Array.isArray(urls)).toBe(true);
    expect(urls).toContain('/');
  });

  it('generates valid XML', async () => {
    const xml = await generateSitemapXml();
    expect(xml).toContain('<?xml');
    expect(xml).toContain('<urlset');
  });
});