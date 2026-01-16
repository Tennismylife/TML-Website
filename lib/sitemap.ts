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

  // --- PLAYERS (avec popularity proxy = total matches, lastmod = latest match) ---
  const players = await prisma.player.findMany({ select: { id: true, slug: true } });
  const playerIds = players.map(p => p.id);

  const winnerStats = await prisma.match.groupBy({
    by: ['winner_id'],
    where: { winner_id: { in: playerIds } },
    _count: { _all: true },
    _max: { tourney_date: true },
  });
  const loserStats = await prisma.match.groupBy({
    by: ['loser_id'],
    where: { loser_id: { in: playerIds } },
    _count: { _all: true },
    _max: { tourney_date: true },
  });

  const playerCountMap: Record<string, number> = {};
  const playerDateMap: Record<string, string | undefined> = {};

  winnerStats.forEach(w => {
    if (!w.winner_id) return;
    playerCountMap[w.winner_id] = (playerCountMap[w.winner_id] || 0) + (w._count?._all || 0);
    if (w._max?.tourney_date) playerDateMap[w.winner_id] = new Date(w._max.tourney_date).toISOString().split('T')[0];
  });
  loserStats.forEach(l => {
    if (!l.loser_id) return;
    playerCountMap[l.loser_id] = (playerCountMap[l.loser_id] || 0) + (l._count?._all || 0);
    const d = l._max?.tourney_date ? new Date(l._max.tourney_date).toISOString().split('T')[0] : undefined;
    if (d) {
      const prev = playerDateMap[l.loser_id];
      playerDateMap[l.loser_id] = !prev || d > prev ? d : prev;
    }
  });

  players.forEach(p => {
    if (!p.slug) return;
    entries.push({ path: `/players/${p.slug}`, popularity: playerCountMap[p.id] || 0, lastmod: playerDateMap[p.id] });
  });

  // --- TOURNAMENTS ---
  const tournaments = await prisma.tournament.findMany({ select: { id: true, slug: true, endDate: true } });
  const tourneyIds = tournaments.map(t => String(t.id));
  const tourneyStats = await prisma.match.groupBy({
    by: ['tourney_id'],
    where: { tourney_id: { in: tourneyIds } },
    _count: { _all: true },
    _max: { tourney_date: true },
  });
  const tourneyCountMap: Record<string, number> = {};
  const tourneyDateMap: Record<string, string | undefined> = {};
  tourneyStats.forEach(s => {
    if (!s.tourney_id) return;
    tourneyCountMap[s.tourney_id] = s._count?._all || 0;
    if (s._max?.tourney_date) tourneyDateMap[s.tourney_id] = new Date(s._max.tourney_date).toISOString().split('T')[0];
  });

  const tournamentMap: Record<string, string> = {};
  tournaments.forEach(t => {
    if (t.slug) tournamentMap[String(t.id)] = t.slug;
    const tourneyIdStr = String(t.id);
    const lastmod = tourneyDateMap[tourneyIdStr] || (t.endDate ? new Date(t.endDate).toISOString().split('T')[0] : undefined);
    entries.push({ path: `/tournaments/${t.slug}`, popularity: tourneyCountMap[tourneyIdStr] || 0, lastmod });
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
    const sid = String(t.id);
    const basePath = `/tournaments/${t.slug}`;
    entries.push({ path: `${basePath}/records`, popularity: tourneyCountMap[sid] || 0, lastmod: tourneyDateMap[sid] || globalMaxDate });
    tournamentRecordSegments.forEach(seg => entries.push({ path: `${basePath}/records/${seg}`, popularity: tourneyCountMap[sid] || 0, lastmod: tourneyDateMap[sid] || globalMaxDate }));
  });

  // --- DEDUPLICATE: keep the most complete entry per path ---
  const map: Record<string, SitemapEntry> = {};
  entries.forEach(e => {
    const prev = map[e.path];
    if (!prev) {
      map[e.path] = e;
      return;
    }
    // prefer entries with lastmod and higher popularity
    const chosen: SitemapEntry = (e.lastmod && !prev.lastmod) || ((e.popularity || 0) > (prev.popularity || 0)) ? e : prev;
    map[e.path] = { ...prev, ...chosen };
  });

  return Object.values(map);
}

export async function getSitemapUrls() {
  const entries = await getSitemapEntries();
  return Array.from(new Set(entries.map(e => e.path)));
}

function clamp(v: number, a = 0.1, b = 1.0) {
  return Math.min(b, Math.max(a, v));
}

function computeChangefreq(path: string, opts?: { lastmod?: string; popularity?: number; maxPopularity?: number }) {
  // Priority rules: records and homepage -> daily
  if (path.includes('/records')) return 'daily';
  if (path === '/') return 'daily';

  // Recency-based rules
  if (opts?.lastmod) {
    const days = (Date.now() - new Date(opts.lastmod).getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 7) return 'daily';
    if (days <= 30) return 'weekly';
    return 'monthly';
  }

  // Base rules when lastmod not available
  if (/^\/(ranking|players|tournaments|statistics|seasons|forecasts|rankingtables)$/.test(path)) return 'weekly';
  if (/^\/players\/[^/]+$/.test(path)) return 'weekly';
  if (/^\/tournaments\/[^/]+$/.test(path)) return 'weekly';
  if (/^\/tournaments\/[^/]+\/\d{4}$/.test(path)) return 'yearly';

  return 'monthly';
}

function computePriority(path: string, opts?: { lastmod?: string; popularity?: number; maxPopularity?: number }) {
  const segments = path.split('/').filter(Boolean).length;

  // Any URL containing '/records' must have maximum priority (includes tournament-specific records)
  if (path.includes('/records')) return 1.0;

  // Homepage highest after records
  if (path === '/') return 1.0;

  // Top-level important pages
  if (/^\/(ranking|players|tournaments|statistics|seasons|forecasts|rankingtables)$/.test(path)) return 0.9;

  // Player and tournament detail pages
  if (/^\/players\/[^/]+$/.test(path)) return 0.8;
  if (/^\/tournaments\/[^/]+$/.test(path)) return 0.8;
  if (/^\/tournaments\/[^/]+\/\d{4}$/.test(path)) return 0.7;

  // Default/base priority
  let basePri = 0.5;

  // recency boost
  let recencyBoost = 0;
  if (opts?.lastmod) {
    const days = (Date.now() - new Date(opts.lastmod).getTime()) / (1000 * 60 * 60 * 24);
    recencyBoost = days <= 7 ? 0.1 : days <= 30 ? 0.05 : 0;
  }

  // popularity boost (normalized to 0..1 then scaled up to 0.2)
  let popularityBoost = 0;
  if (opts?.popularity && opts.maxPopularity && opts.maxPopularity > 0) {
    const norm = Math.min(1, opts.popularity / opts.maxPopularity);
    popularityBoost = norm * 0.2;
  }

  const depthPenalty = Math.max(0, segments - 1) * 0.03;
  const pri = clamp(+((basePri + recencyBoost + popularityBoost - depthPenalty).toFixed(2)));
  return pri;
}

export async function generateSitemapXml() {
  const base = process.env.SITE_URL || 'https://stats.tennismylife.org';
  const entries = await getSitemapEntries();

  // compute global max popularity for normalization
  const maxPopularity = entries.reduce((m, e) => Math.max(m, e.popularity || 0), 0);

  // --- GENERATE XML ---
  const urls = entries
    .map(e => {
      const priority = computePriority(e.path, { lastmod: e.lastmod, popularity: e.popularity, maxPopularity }).toFixed(2);
      const lastmodTag = e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>\n` : '';
      const changefreq = computeChangefreq(e.path, { lastmod: e.lastmod, popularity: e.popularity, maxPopularity });
      return `  <url>\n    <loc>${base}${e.path}</loc>\n${lastmodTag}    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}
