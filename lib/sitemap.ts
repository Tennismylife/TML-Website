import { prisma } from './prisma';

export type SitemapEntry = {
  path: string;
  lastmod?: string; // YYYY-MM-DD
  popularity?: number; // raw count proxy
};

export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  // --- STATIC ROUTES ---
  const staticRoutes = [
    '/',
    '/records',
    '/ranking',
    '/players',
    '/tournaments',
    '/h2h',
    '/player-vs-player',
    '/statistics',
    '/seasons',
    '/forecasts',
    '/rankingtables',

    // --- RECORDS DAILY ---
    '/records/same/playeddaily',
    '/records/same/entriesdaily',
    '/records/same/titlesdaily',
    '/records/same/rounddaily',
    '/records/seasons/winsdaily',
    '/records/seasons/playeddaily',
    '/records/seasons/entriesdaily',
    '/records/seasons/titlesdaily',
    '/records/seasons/rounddaily',
    '/records/seasons/percentagedaily',
    '/records/atage/winsdaily',
    '/records/atage/playeddaily',
    '/records/atage/entriesdaily',
    '/records/atage/titlesdaily',
    '/records/atage/slamsdaily',
    '/records/atage/rounddaily',
    '/records/ageofnth/winsdaily',
    '/records/ageofnth/playeddaily',
    '/records/ageofnth/entriesdaily',
    '/records/ageofnth/titlesdaily',
    '/records/ageofnth/slamsdaily',
    '/records/ageofnth/rounddaily',
    '/records/neededto/titlesdaily',
    '/records/counterseasons/rounddaily',
    '/records/counterseasons/titlesdaily',
    '/records/streak/winsdaily',
    '/records/streak/rounddaily',
    '/records/h2h/countdaily',
  ];

  const entries: SitemapEntry[] = staticRoutes.map(p => ({ path: p }));

  // global latest match date (used for records pages lastmod)
  const globalMax = await prisma.match.aggregate({ _max: { tourney_date: true } });
  const globalMaxDate = globalMax._max.tourney_date ? new Date(globalMax._max.tourney_date).toISOString().split('T')[0] : undefined;

  // --- PLAYERS ---
  const players = await prisma.player.findMany({ select: { id: true, slug: true } });
  players.forEach(p => {
    if (!p.slug) return;
    entries.push({ path: `/players/${p.slug}` });
  });

  // --- TOURNAMENTS ---
  const tournaments = await prisma.tournament.findMany({ select: { id: true, slug: true, endDate: true } });
  const tournamentMap: Record<string, string> = {};
  tournaments.forEach(t => {
    if (!t.slug) return;
    tournamentMap[String(t.id)] = t.slug;
    entries.push({ path: `/tournaments/${t.slug}` });
  });

  // --- TOURNAMENT EDITIONS ---
  const editions = await prisma.match.findMany({ select: { tourney_id: true, year: true }, distinct: ['tourney_id', 'year'] });
  for (const e of editions) {
    if (!e.tourney_id || !e.year) continue;
    const sid = String(e.tourney_id);
    if (!tournamentMap[sid]) continue;
    const agg = await prisma.match.aggregate({
      _count: { _all: true },
      _max: { tourney_date: true },
      where: { tourney_id: sid, year: e.year },
    });
    const lastmod = agg._max?.tourney_date ? new Date(agg._max.tourney_date).toISOString().split('T')[0] : undefined;
    entries.push({ path: `/tournaments/${tournamentMap[sid]}/${e.year}`, popularity: agg._count?._all || 0, lastmod });
  }

  // --- RECORDS DINAMICI ---
  let recordUrls: string[] = [];
  try {
    const mod = await import('../app/records/[...slug]/page');
    if (mod && typeof mod.generateStaticParams === 'function') {
      const params = await mod.generateStaticParams();
      if (Array.isArray(params)) {
        recordUrls = params.map((p: any) => (Array.isArray(p.slug) ? `/records/${p.slug.join('/')}` : `/records`)).filter(Boolean);
      }
    }
  } catch (e) {
    console.warn('Could not load dynamic record URLs:', e);
  }
  recordUrls.forEach(r => entries.push({ path: r, lastmod: globalMaxDate, popularity: undefined }));

  // --- COMBINE tournament-specific record pages ---
  const tournamentRecordSegments = [
    /* Count */
    'count/titles',
    'count/wins',
    'count/played',
    'count/entries',

    /* Percentage */
    'percentage/wins',
    'percentage/rounds/R128',
    'percentage/rounds/R64',
    'percentage/rounds/R32',
    'percentage/rounds/R16',
    'percentage/rounds/QF',
    'percentage/rounds/SF',
    'percentage/rounds/F',

    /* Timespan */
    'timespan/rounds/Titles',
    'timespan/rounds/R128',
    'timespan/rounds/R64',
    'timespan/rounds/R32',
    'timespan/rounds/R16',
    'timespan/rounds/QF',
    'timespan/rounds/SF',
    'timespan/rounds/F',

    /* Rounds on entries */
    'roundsonentries/rounds/Winner',
    'roundsonentries/rounds/R32',
    'roundsonentries/rounds/R16',
    'roundsonentries/rounds/QF',
    'roundsonentries/rounds/SF',
    'roundsonentries/rounds/F',

    /* Least */
    'least/rounds/R32',
    'least/rounds/R16',
    'least/rounds/QF',
    'least/rounds/SF',
    'least/rounds/F',
    'least/rounds/W',

    /* Ages */
    'ages/main/youngest',
    'ages/main/oldest',
    'ages/titles/youngest',
    'ages/titles/oldest',
    'ages/youngestrounds/R128',
    'ages/youngestrounds/R64',
    'ages/youngestrounds/R32',
    'ages/youngestrounds/R16',
    'ages/youngestrounds/QF',
    'ages/youngestrounds/SF',
    'ages/youngestrounds/F',
    'ages/oldestrounds/R128',
    'ages/oldestrounds/R64',
    'ages/oldestrounds/R32',
    'ages/oldestrounds/R16',
    'ages/oldestrounds/QF',
    'ages/oldestrounds/SF',
    'ages/oldestrounds/F',
  ];

  tournaments.filter(t => !!t.slug).forEach(t => {
    const basePath = `/tournaments/${t.slug}`;
    entries.push({ path: `${basePath}/records` });
    tournamentRecordSegments.forEach(seg => entries.push({ path: `${basePath}/records/${seg}` }));
  });

  // --- DEDUPLICATE: keep the most complete entry per path ---
  const map: Record<string, SitemapEntry> = {};
  entries.forEach(e => {
    const prev = map[e.path];
    if (!prev) {
      map[e.path] = e;
      return;
    }
    // prefer entries with lastmod when available
    const chosen: SitemapEntry = (e.lastmod && !prev.lastmod) ? e : prev;
    map[e.path] = { ...prev, ...chosen };
  });

  return Object.values(map);
}

export async function getSitemapUrls() {
  const entries = await getSitemapEntries();
  return Array.from(new Set(entries.map(e => e.path)));
}

// Simplified changefreq rules (kept simple and fast)
function computeChangefreq(path: string, opts?: { lastmod?: string }) {
  if (path.includes('/records')) return 'daily';
  if (path === '/') return 'daily';
  if (opts?.lastmod) {
    const days = (Date.now() - new Date(opts.lastmod).getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 7) return 'daily';
    if (days <= 30) return 'weekly';
    return 'monthly';
  }
  if (/^\/(ranking|players|tournaments|statistics|seasons|forecasts|rankingtables)$/.test(path)) return 'weekly';
  if (/^\/players\/[^/]+$/.test(path)) return 'weekly';
  if (/^\/tournaments\/[^/]+$/.test(path)) return 'weekly';
  if (/^\/tournaments\/[^/]+\/\d{4}$/.test(path)) return 'yearly';
  return 'monthly';
} 

export async function generateSitemapXml() {
  const base = process.env.SITE_URL || 'https://stats.tennismylife.org';
  const entries = await getSitemapEntries();

  // --- GENERATE XML (simple priorities) ---
  const urls = entries
    .map(e => {
      const lastmodTag = e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>\n` : '';
      const changefreq = computeChangefreq(e.path, { lastmod: e.lastmod });
      const priority = (e.path.includes('/records') || e.path === '/') ? '1.00' : '0.50';
      return `  <url>\n    <loc>${base}${e.path}</loc>\n${lastmodTag}    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}
