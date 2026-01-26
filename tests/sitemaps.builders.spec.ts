import { describe, it, expect } from 'vitest';
import { buildSectionPartitions, buildPlayerPartitions } from '@/src/sitemaps/builders';

// helper to create async iterable
async function* genRange(n: number, prefix = '/s') {
  for (let i = 0; i < n; i++) yield { loc: `${prefix}${i}` };
}

async function* genPlayers(n: number, letter = 'A') {
  for (let i = 0; i < n; i++) yield { slug: `${letter.toLowerCase()}-p-${i}` };
}

describe('sitemaps builders partitioning', () => {
  it('partitions sections into multiple files when small maxPerFile provided', async () => {
    const sections = genRange(105, '/sec');
    const map = await buildSectionPartitions(sections, 50);
    expect(map.size).toBe(3);
    expect(map.has('sitemap-sections.xml')).toBe(true);
    expect(map.has('sitemap-sections-2.xml')).toBe(true);
    expect(map.has('sitemap-sections-3.xml')).toBe(true);
  });

  it('groups players by letter and paginates perFile', async () => {
    const players = (async function*(){
      // 120 players all starting with A
      for await (const p of genPlayers(120, 'A')) yield p;
    })();
    const map = await buildPlayerPartitions(players, [], 50);
    // Should produce 3 pages for A
    const files = Array.from(map.keys()).filter(k => k.startsWith('sitemap-players-A'));
    expect(files.length).toBe(3);
    expect(files).toContain('sitemap-players-A.xml');
    expect(files).toContain('sitemap-players-A-2.xml');
    expect(files).toContain('sitemap-players-A-3.xml');
  });
});