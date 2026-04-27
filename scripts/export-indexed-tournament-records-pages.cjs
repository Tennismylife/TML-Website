const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ROOT_ONLY_RECORDS_TOURNAMENT_SLUGS = new Set([
  'brisbane','hong-kong','united-cup','adelaide-3','auckland','montpellier','dallas-2','rotterdam','buenos-aires-2','delray-beach','marseille','doha','rio-de-janeiro','acapulco','dubai','santiago-2','indian-wells-masters','miami-masters','bucharest-2','houston-2','marrakech','monte-carlo-masters','barcelona','munich','madrid-masters','rome-masters','geneva','hamburg','s-hertogenbosch','stuttgart','halle','queens-club','eastbourne','mallorca-2','bastad','gstaad','los-cabos','kitzbuhel','umag','washington','canada-masters','cincinnati-masters','winston-salem','chengdu','hangzhou','beijing','tokyo','shanghai','almaty','brussels-3','stockholm','basel','vienna','paris-masters','athens-2','metz','atp-finals','next-gen-atp-finals',
]);

const SLAM_RECORDS_TOURNAMENT_SLUGS = new Set([
  'australian-open','roland-garros','wimbledon','us-open',
]);

const SLAM_RECORD_SEGMENTS = [
  'count/titles','count/wins','count/played','count/entries',
  'percentage/wins','percentage/rounds/R128','percentage/rounds/R64','percentage/rounds/R32','percentage/rounds/R16','percentage/rounds/QF','percentage/rounds/SF','percentage/rounds/F',
  'timespan/rounds/Titles','timespan/rounds/R128','timespan/rounds/R64','timespan/rounds/R32','timespan/rounds/R16','timespan/rounds/QF','timespan/rounds/SF','timespan/rounds/F',
  'roundsonentries/rounds/Winner','roundsonentries/rounds/R32','roundsonentries/rounds/R16','roundsonentries/rounds/QF','roundsonentries/rounds/SF','roundsonentries/rounds/F',
  'least/rounds/R32','least/rounds/R16','least/rounds/QF','least/rounds/SF','least/rounds/F','least/rounds/W',
  'ages/main/youngest','ages/main/oldest','ages/titles/youngest','ages/titles/oldest','ages/youngestrounds/R128','ages/youngestrounds/R64','ages/youngestrounds/R32','ages/youngestrounds/R16','ages/youngestrounds/QF','ages/youngestrounds/SF','ages/youngestrounds/F','ages/oldestrounds/R128','ages/oldestrounds/R64','ages/oldestrounds/R32','ages/oldestrounds/R16','ages/oldestrounds/QF','ages/oldestrounds/SF','ages/oldestrounds/F',
];

function collectCategoryVals(category) {
  const vals = [];
  function collect(v) {
    if (typeof v === 'string') vals.push(v.toUpperCase().trim());
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object') Object.values(v).forEach(collect);
  }
  collect(category);
  return vals;
}

function shouldIndexRecords(category, years) {
  const vals = collectCategoryVals(category);
  const ALWAYS = new Set(['G', 'M', 'F', 'O', 'GRAND_SLAM', 'MASTERS_1000', 'FINALS', 'OLYMPICS']);
  if (vals.some(v => ALWAYS.has(v))) return true;
  const RECENT = new Set(['500', '250', 'ATP500', 'ATP250']);
  if (vals.some(v => RECENT.has(v))) {
    const yearsList = Array.isArray(years) ? years : [];
    const maxYear = yearsList.reduce((max, y) => {
      const n = parseInt(String(y), 10);
      return Number.isNaN(n) ? max : Math.max(max, n);
    }, 0);
    return maxYear >= 2020;
  }
  return false;
}

async function main() {
  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';

  const subPaths = [
    'records',
    'records/count/titles',
    'records/count/wins',
    'records/count/played',
    'records/count/entries',
    'records/rounds',
    'records/ages/main',
    'records/ages/titles',
    'records/ages/youngestrounds',
    'records/ages/oldestrounds',
    'records/percentage/wins',
    'records/percentage/rounds',
    'records/streak',
    'records/timespan',
    'records/least',
    'records/roundsonentries/rounds/W',
  ];

  const tournaments = await prisma.tournament.findMany({
    select: {
      slug: true,
      category: true,
      years: true,
    },
  });

  const rows = [];
  for (const tournament of tournaments) {
    const slug = String(tournament.slug || '').toLowerCase();
    if (!slug) continue;
    if (!ROOT_ONLY_RECORDS_TOURNAMENT_SLUGS.has(slug) && !SLAM_RECORDS_TOURNAMENT_SLUGS.has(slug)) continue;

    rows.push({ url: `${site}/tournaments/${slug}/records`, slug, page: 'records' });

    if (SLAM_RECORDS_TOURNAMENT_SLUGS.has(slug)) {
      for (const seg of SLAM_RECORD_SEGMENTS) {
        rows.push({ url: `${site}/tournaments/${slug}/records/${seg}`, slug, page: `records/${seg}` });
      }
    }
  }

  const outDir = path.join(__dirname, '..', 'tmp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'indexed-tournament-records-pages.csv');

  const header = 'url,slug,page';
  const lines = rows.map(r => `${r.url},${r.slug},${r.page}`);
  fs.writeFileSync(outPath, [header, ...lines].join('\n'), 'utf8');

  console.log(`Wrote ${rows.length} rows to ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
