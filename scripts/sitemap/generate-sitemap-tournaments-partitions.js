#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const jiti = require('jiti')(__filename);

async function main() {
  try {
    const { prisma } = jiti(path.join(process.cwd(), 'lib', 'prisma'));

    const siteBase = (process.env.SITE_URL || 'https://stats.tennismylife.org').replace(/\/$/, '');

    // record segments used across tournaments
    const tournamentRecordSegments = [
      'records',
      'records/count/titles', 'records/count/wins', 'records/count/played', 'records/count/entries',
      'records/percentage/wins', 'records/percentage/rounds/R128','records/percentage/rounds/R64','records/percentage/rounds/R32','records/percentage/rounds/R16','records/percentage/rounds/QF','records/percentage/rounds/SF','records/percentage/rounds/F',
      'records/timespan/rounds/Titles','records/timespan/rounds/R128','records/timespan/rounds/R64','records/timespan/rounds/R32','records/timespan/rounds/R16','records/timespan/rounds/QF','records/timespan/rounds/SF','records/timespan/rounds/F',
      'records/roundsonentries/rounds/Winner','records/roundsonentries/rounds/R32','records/roundsonentries/rounds/R16','records/roundsonentries/rounds/QF','records/roundsonentries/rounds/SF','records/roundsonentries/rounds/F',
      'records/least/rounds/R32','records/least/rounds/R16','records/least/rounds/QF','records/least/rounds/SF','records/least/rounds/F','records/least/rounds/W',
      'records/ages/main/youngest','records/ages/main/oldest','records/ages/titles/youngest','records/ages/titles/oldest',
      'records/ages/youngestrounds/R128','records/ages/youngestrounds/R64','records/ages/youngestrounds/R32','records/ages/youngestrounds/R16','records/ages/youngestrounds/QF','records/ages/youngestrounds/SF','records/ages/youngestrounds/F',
      'records/ages/oldestrounds/R128','records/ages/oldestrounds/R64','records/ages/oldestrounds/R32','records/ages/oldestrounds/R16','records/ages/oldestrounds/QF','records/ages/oldestrounds/SF','records/ages/oldestrounds/F'
    ];

    // fetch tournaments
    console.log('Fetching tournaments...');
    const tournaments = await prisma.tournament.findMany({ select: { id: true, slug: true } });
    const tournamentMap = {};
    tournaments.forEach(t => { if (t.slug) tournamentMap[String(t.id)] = String(t.slug); });

    // fetch editions (distinct per tourney_id/year)
    console.log('Fetching editions...');
    const editions = await prisma.match.findMany({ select: { tourney_id: true, year: true }, distinct: ['tourney_id', 'year'] });
    const editionsMap = {};
    for (const e of editions) {
      if (!e.tourney_id || !e.year) continue;
      const sid = String(e.tourney_id);
      if (!tournamentMap[sid]) continue;
      editionsMap[sid] = editionsMap[sid] || new Set();
      editionsMap[sid].add(String(e.year));
    }

    // optional: tournament last match date map (for lastmod header)
    console.log('Computing lastmod per tournament (groupBy)...');
    let lastMap = {};
    try {
      const groups = await prisma.match.groupBy({ by: ['tourney_id'], _max: { tourney_date: true } });
      for (const g of groups) {
        if (!g.tourney_id) continue;
        const sid = String(g.tourney_id);
        if (g._max?.tourney_date) lastMap[sid] = (new Date(g._max.tourney_date)).toISOString().split('T')[0];
      }
    } catch (e) {
      console.warn('groupBy failed, skipping lastmod per tournament:', e.message || e);
    }

    // partition map A..Z
    const partitions = {};
    const ensurePartition = (ch) => { if (!partitions[ch]) partitions[ch] = new Set(); return partitions[ch]; };

    // build urls
    console.log('Building urls and partitioning...');
    for (const [id, slug] of Object.entries(tournamentMap)) {
      const first = (slug && slug[0] ? slug[0].toUpperCase() : 'Z');
      const letter = /^[A-Z]$/.test(first) ? first : 'Z';
      const set = ensurePartition(letter);

      // base tournament page
      set.add(`/tournaments/${slug}`);

      // record segments (include root 'records' too)
      for (const seg of tournamentRecordSegments) set.add(`/tournaments/${slug}/${seg}`);

      // editions
      const years = Array.from(editionsMap[id] || []).sort();
      for (const y of years) set.add(`/tournaments/${slug}/${y}`);
    }

    // write files
    const outDir = path.join(process.cwd(), 'public', 'sitemaps');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    let totalUrls = 0;
    console.log('Writing partition files...');
    for (const ch of Object.keys(partitions).sort()) {
      const urls = Array.from(partitions[ch]).sort();
      totalUrls += urls.length;
      const xmlUrls = urls.map(u => {
        const lastmod = (() => {
          // attempt to use tournament lastmod for /tournaments/<slug> only
          const m = u.match(/^\/tournaments\/([^/]+)(?:$|\/)/);
          if (m) {
            const slug = m[1];
            // find id by slug
            const id = Object.keys(tournamentMap).find(k => tournamentMap[k] === slug);
            if (id && lastMap[id]) return `    <lastmod>${lastMap[id]}</lastmod>\n`;
          }
          return '';
        })();
        return `  <url>\n    <loc>${siteBase}${u}</loc>\n${lastmod}    <changefreq>weekly</changefreq>\n    <priority>0.50</priority>\n  </url>`;
      }).join('\n');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlUrls}\n</urlset>`;
      const fname = `sitemap-tournaments-${ch}.xml`;
      const outPath = path.join(outDir, fname);
      fs.writeFileSync(outPath, xml, 'utf8');
      fs.writeFileSync(outPath + '.gz', zlib.gzipSync(Buffer.from(xml, 'utf8')));
      console.log('WROTE', outPath, 'entries=', urls.length);
    }

    console.log('Total tournament urls written:', totalUrls);

    // regenerate sitemap index
    try {
      require('./generate_sitemap_index');
      console.log('Regenerated sitemap index');
    } catch (e) {
      console.warn('Could not regenerate sitemap index:', e.message || e);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
