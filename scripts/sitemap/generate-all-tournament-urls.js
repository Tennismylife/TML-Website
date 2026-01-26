#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const jiti = require('jiti')(__filename);

async function main() {
  try {
    // load prisma from project lib
    const { prisma } = jiti(path.join(process.cwd(), 'lib', 'prisma'));

    // fetch tournaments
    const tournaments = await prisma.tournament.findMany({ select: { id: true, slug: true } });
    const tournamentMap = {};
    tournaments.forEach(t => { if (t.slug) tournamentMap[String(t.id)] = String(t.slug); });

    // fetch editions (distinct tourney_id, year)
    const editions = await prisma.match.findMany({ select: { tourney_id: true, year: true }, distinct: ['tourney_id', 'year'] });
    const editionsMap = {};
    for (const e of editions) {
      if (!e.tourney_id || !e.year) continue;
      const sid = String(e.tourney_id);
      if (!tournamentMap[sid]) continue;
      editionsMap[sid] = editionsMap[sid] || new Set();
      editionsMap[sid].add(String(e.year));
    }

    // tournament record segments (same as used elsewhere)
    const tournamentRecordSegments = [
      'count/titles', 'count/wins', 'count/played', 'count/entries',
      'percentage/wins', 'percentage/rounds/R128','percentage/rounds/R64','percentage/rounds/R32','percentage/rounds/R16','percentage/rounds/QF','percentage/rounds/SF','percentage/rounds/F',
      'timespan/rounds/Titles','timespan/rounds/R128','timespan/rounds/R64','timespan/rounds/R32','timespan/rounds/R16','timespan/rounds/QF','timespan/rounds/SF','timespan/rounds/F',
      'roundsonentries/rounds/Winner','roundsonentries/rounds/R32','roundsonentries/rounds/R16','roundsonentries/rounds/QF','roundsonentries/rounds/SF','roundsonentries/rounds/F',
      'least/rounds/R32','least/rounds/R16','least/rounds/QF','least/rounds/SF','least/rounds/F','least/rounds/W',
      'ages/main/youngest','ages/main/oldest','ages/titles/youngest','ages/titles/oldest',
      'ages/youngestrounds/R128','ages/youngestrounds/R64','ages/youngestrounds/R32','ages/youngestrounds/R16','ages/youngestrounds/QF','ages/youngestrounds/SF','ages/youngestrounds/F',
      'ages/oldestrounds/R128','ages/oldestrounds/R64','ages/oldestrounds/R32','ages/oldestrounds/R16','ages/oldestrounds/QF','ages/oldestrounds/SF','ages/oldestrounds/F'
    ];

    const base = (process.env.SITE_URL || 'https://stats.tennismylife.org').replace(/\/$/, '');
    const out = [];

    for (const [id, slug] of Object.entries(tournamentMap)) {
      // tournament landing
      out.push(`${base}/tournaments/${slug}`);

      // tournament-level records
      out.push(`${base}/tournaments/${slug}/records`);
      for (const seg of tournamentRecordSegments) out.push(`${base}/tournaments/${slug}/records/${seg}`);

      // editions
      const years = Array.from(editionsMap[id] || []).sort();
      for (const y of years) {
        out.push(`${base}/tournaments/${slug}/${y}`);
      }
    }

    // dedupe and sort
    const unique = Array.from(new Set(out)).sort();

    // write results
    const reportsDir = path.join(process.cwd(), 'scripts', 'sitemap', 'reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
    const txtPath = path.join(reportsDir, 'tournament-urls.txt');
    fs.writeFileSync(txtPath, unique.join('\n'), 'utf8');

    console.log('WROTE', txtPath, 'entries=', unique.length);
    process.exit(0);
  } catch (e) {
    console.error('Error generating tournament urls:', e);
    process.exit(1);
  }
}

main();
