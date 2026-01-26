#!/usr/bin/env node
const jiti = require('jiti')(__filename);
const path = require('path');
(async () => {
  try {
    const sitemap = jiti(path.join(process.cwd(), 'lib', 'sitemap.ts'));
    const { generateSitemapXml, getSitemapEntries } = sitemap;
    const xml = await generateSitemapXml();
    console.log('--- GENERATED SITEMAP (truncated to first 2000 chars) ---\n');
    console.log(xml.slice(0, 2000));
    console.log('\n--- SAMPLE PRIORITIES ---\n');

    const entries = await getSitemapEntries();
    const samplePaths = [
      '/',
      '/records/same/wins',
      '/tournaments/aus-open',
      '/tournaments/aus-open/records/count/wins',
      '/players/player-one',
      '/tournaments/aus-open/2025',
      '/h2h'
    ];

    const getPriorityFromXml = (path) => {
      const esc = path.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const re = new RegExp(`<url>[\s\S]*?<loc>https?:\\/\\/[^<]+${esc}<\\/loc>[\s\S]*?<priority>([0-9.]+)<\\/priority>[\s\S]*?<\\/url>`);
      const m = xml.match(re);
      return m ? m[1] : null;
    }

    for (const p of samplePaths) {
      const pri = getPriorityFromXml(p);
      console.log(`${p} -> ${pri ?? 'not-found'}`);
    }

    process.exit(0);
  } catch (e) {
    console.error('Error generating sitemap:', e);
    process.exit(1);
  }
})();