#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const jiti = require('jiti')(__filename);

async function main() {
  try {
    // load prisma client via jiti so we can run in ts/esm environment
    const { prisma } = jiti(path.join(process.cwd(), 'lib', 'prisma'));

    // find the most recent ranking date
    let slugs;
    try {
      const latest = await prisma.rankingDate.findFirst({ orderBy: { date: 'desc' } });
      if (!latest) throw new Error('no ranking dates found');

      // grab top 100 players by rank, include slug and name
      const top100 = await prisma.ranking.findMany({
        where: { rankingDateId: latest.id, rank: { lte: 100 } },
        orderBy: { rank: 'asc' },
        include: { player: true },
      });

      slugs = top100
        .map(r => r.player?.slug)
        .filter(Boolean)
        .map(s => String(s))
        .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    } catch (dbErr) {
      console.warn('Could not query database for top100, falling back to sample slugs:', dbErr.message || dbErr);
      // Provide a small sample dataset so script can still output something.
      slugs = ['carlos-alcaraz', 'jannik-sinner', 'rafael-nadal', 'roger-federer'];
    }

    // generate all alphabetical combinations (i<j since list sorted)
    const urls = [];
    for (let i = 0; i < slugs.length; i++) {
      for (let j = i + 1; j < slugs.length; j++) {
        const a = slugs[i];
        const b = slugs[j];
        urls.push(`/h2h/${a}-vs-${b}`);
      }
    }

    // build xml
    const siteBase = (process.env.SITE_URL || 'https://stats.tennismylife.org').replace(/\/$/, '');
    const xmlUrls = urls
      .map(u => `  <url>\n    <loc>${siteBase}${u}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.50</priority>\n  </url>`)
      .join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlUrls}\n</urlset>`;

    const outDir = path.join(process.cwd(), 'public', 'sitemaps');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'sitemap-h2h-top100.xml');
    fs.writeFileSync(outPath, xml, 'utf8');
    fs.writeFileSync(outPath + '.gz', zlib.gzipSync(Buffer.from(xml, 'utf8')));
    console.log('WROTE', outPath, 'entries=', urls.length);

    // regenerate index so this file is included
    const genIndex = require('./generate_sitemap_index');
    if (typeof genIndex === 'function') genIndex();
    else {
      require('child_process').execFileSync('node', [path.join(__dirname, 'generate_sitemap_index.js')], { stdio: 'inherit' });
    }
  } catch (err) {
    console.error('Error generating h2h-top100 sitemap:', err);
    process.exit(1);
  }
}

main();
