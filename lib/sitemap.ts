import { prisma } from './prisma';
import { getWhitelistedSitemapPaths } from './seo/records-policy';

const PLAYER_INDEX_SNAPSHOT_DATE = new Date('2026-04-20T00:00:00.000Z');

const ROOT_ONLY_RECORDS_TOURNAMENT_SLUGS = new Set([
  'brisbane','hong-kong','united-cup','adelaide-3','auckland','montpellier','dallas-2','rotterdam','buenos-aires-2','delray-beach','marseille','doha','rio-de-janeiro','acapulco','dubai','santiago-2','indian-wells-masters','miami-masters','bucharest-2','houston-2','marrakech','monte-carlo-masters','barcelona','munich','madrid-masters','rome-masters','geneva','hamburg','s-hertogenbosch','stuttgart','halle','queens-club','eastbourne','mallorca-2','bastad','gstaad','los-cabos','kitzbuhel','umag','washington','canada-masters','cincinnati-masters','winston-salem','chengdu','hangzhou','beijing','tokyo','shanghai','almaty','brussels-3','stockholm','basel','vienna','paris-masters','athens-2','metz','atp-finals','next-gen-atp-finals',
]);

const SLAM_RECORDS_TOURNAMENT_SLUGS = new Set([
  'australian-open','roland-garros','wimbledon','us-open',
]);

export type SitemapEntry = {
  path: string;
  lastmod?: string; // YYYY-MM-DD
  popularity?: number; // raw count proxy
};

export async function getSitemapEntries(opts?: { excludePlayers?: boolean; excludeTournaments?: boolean; excludeRecords?: boolean; excludeRecordsranking?: boolean }): Promise<SitemapEntry[]> {
  // --- STATIC ROUTES ---
  const staticRoutes = [
    '/',
    '/records',
    '/ranking',
    '/tennis-match-database',
    '/h2h',
    '/player-vs-player',
    '/statistics',
    '/seasons',
    '/forecasts',
    '/rankingtables',
    '/schedule',
    '/tournaments',

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

  let entries: SitemapEntry[] = staticRoutes.map(p => ({ path: p }));

  // Optionally remove all /records static entries early when requested
  if (opts?.excludeRecords) {
    entries = entries.filter(e => !e.path.startsWith('/records'));
  }

  // global latest match date (used for records pages lastmod and whitelist entries)
  const globalMax = await prisma.match.aggregate({ _max: { tourney_date: true } });
  const globalMaxDate = globalMax._max.tourney_date ? new Date(globalMax._max.tourney_date).toISOString().split('T')[0] : undefined;

  // --- RECORDS SEO WHITELIST (filtered /records pages) ---
  // These are the only filtered /records/* URLs that belong in the sitemap.
  // They are defined centrally in lib/seo/records-policy.ts.
  if (!opts?.excludeRecords) {
    const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'https://stats.tennismylife.org';
    const wlPaths = getWhitelistedSitemapPaths(origin);
    for (const p of wlPaths) {
      if (!entries.some(e => e.path === p)) {
        entries.push({ path: p, lastmod: globalMaxDate });
      }
    }
  }

  // --- PLAYERS ---
  // Player profile pages are normally included here; they can be excluded when generating
  // the sections sitemap by passing { excludePlayers: true } to getSitemapEntries.
  if (!opts?.excludePlayers) {
    const players = await prisma.player.findMany({ select: { id: true, slug: true } });
    // Build set of slugs for canonical detection
    const slugSet = new Set(players.filter(p => p.slug).map(p => String(p.slug).toLowerCase()));

    // Build indexable landing player set from the current snapshot, recent matches and top-20 history.
    const eligiblePlayerIds = new Set<string>();
    const rankingDate = await prisma.rankingDate.findFirst({ where: { date: PLAYER_INDEX_SNAPSHOT_DATE }, select: { id: true } });
    if (rankingDate?.id) {
      const rankingRows = await prisma.ranking.findMany({ where: { rankingDateId: rankingDate.id }, select: { playerId: true } });
      rankingRows.forEach(row => { if (row.playerId) eligiblePlayerIds.add(String(row.playerId)); });
    }

    const thresholdDate = new Date();
    thresholdDate.setMonth(thresholdDate.getMonth() - 18);
    const recentMatches = await prisma.match.findMany({ where: { status: true, tourney_date: { gte: thresholdDate }, tourney_level: { not: 'D' } }, select: { winner_id: true, loser_id: true } });
    recentMatches.forEach(match => {
      if (match.winner_id) eligiblePlayerIds.add(match.winner_id);
      if (match.loser_id) eligiblePlayerIds.add(match.loser_id);
    });

    const titleWinners = await prisma.match.findMany({
      where: {
        status: true,
        round: 'F',
        team_event: false,
        tourney_level: { not: 'D' },
        NOT: {
          OR: [
            { score: { contains: 'WEA' } },
            { score: 'To play' },
          ],
        },
      },
      select: { winner_id: true },
    });
    titleWinners.forEach(row => { if (row.winner_id) eligiblePlayerIds.add(row.winner_id); });

    const top20Rows = await prisma.ranking.findMany({ where: { rank: { lte: 20 } }, select: { playerId: true } });
    top20Rows.forEach(row => { if (row.playerId) eligiblePlayerIds.add(String(row.playerId)); });

    // Aggregate popularity / lastmod per player (wins + losses) using groupBy
    const playerIds = players.map(p => p.id).filter(Boolean);
    const popularityMap: Record<string, { count: number; lastmod?: string }> = {};
    if (playerIds.length) {
      try {
        // wins
        const wins = await prisma.match.groupBy({ by: ['winner_id'], _count: { _all: true }, _max: { tourney_date: true }, where: { winner_id: { in: playerIds } } as any });
        for (const w of wins) {
          if (!w.winner_id) continue;
          popularityMap[String(w.winner_id)] = popularityMap[String(w.winner_id)] || { count: 0 };
          popularityMap[String(w.winner_id)].count += (typeof w._count === 'object' ? (w._count._all || 0) : 0);
          if (w._max?.tourney_date) popularityMap[String(w.winner_id)].lastmod = (new Date(w._max.tourney_date)).toISOString().split('T')[0];
        }
        // losses
        const losses = await prisma.match.groupBy({ by: ['loser_id'], _count: { _all: true }, _max: { tourney_date: true }, where: { loser_id: { in: playerIds } } as any });
        for (const l of losses) {
          if (!l.loser_id) continue;
          popularityMap[String(l.loser_id)] = popularityMap[String(l.loser_id)] || { count: 0 };
          popularityMap[String(l.loser_id)].count += (typeof l._count === 'object' ? (l._count._all || 0) : 0);
          const ldate = l._max?.tourney_date ? (new Date(l._max.tourney_date)).toISOString().split('T')[0] : undefined;
          if (ldate) {
            const cur = popularityMap[String(l.loser_id)].lastmod;
            if (!cur || new Date(ldate) > new Date(cur)) popularityMap[String(l.loser_id)].lastmod = ldate;
          }
        }
      } catch (e) {
        // ignore grouping errors
      }
    }

    for (const p of players) {
      if (!p.slug) continue;
      if (!eligiblePlayerIds.has(p.id)) continue;
      const slug = String(p.slug).toLowerCase();
      // Exclude anonymous or qualifier placeholder slugs
      if (slug.startsWith('unknown-') || slug.startsWith('qualifier-')) continue;

      // Try to normalize variant slugs to a base canonical slug present in DB
      let canonical = slug;
      try {
        const { normalizePlayerSlugVariant } = await import('./utils');
        const base = normalizePlayerSlugVariant(slug);
        if (base && slugSet.has(base)) canonical = base;
      } catch (e) {
        // ignore
      }

      // Only include canonical profiles in sitemap to avoid duplicates
      if (canonical !== slug) continue;

      const pop = popularityMap[String(p.id)];
      entries.push({ path: `/players/${slug}`, popularity: pop?.count, lastmod: pop?.lastmod });

      // --- PLAYER SEASONS: add /players/:slug/season/:year pages for each year the player played
      try {
        const seasons = await prisma.match.groupBy({
          by: ['year'],
          where: { OR: [{ winner_id: p.id }, { loser_id: p.id }], year: { not: null } } as any,
        } as any);
        for (const s of seasons) {
          const year = s.year as number | undefined;
          if (!year) continue;
          const agg = await prisma.match.aggregate({
            _count: { _all: true },
            _max: { tourney_date: true },
            where: { year: year, OR: [{ winner_id: p.id }, { loser_id: p.id }] } as any,
          } as any);
          const lastmod = agg._max?.tourney_date ? new Date(agg._max.tourney_date).toISOString().split('T')[0] : undefined;
          const seasonPopularity = (typeof agg._count === 'object') ? agg._count._all : undefined;
          entries.push({ path: `/players/${slug}/season/${year}`, popularity: seasonPopularity, lastmod });
        }
      } catch (e) {
        // ignore per-player grouping errors
      }
    }
  }

  // --- TOURNAMENTS ---
  // Tournaments are normally included here; they can be excluded when generating the
  // sections sitemap by passing { excludeTournaments: true } to getSitemapEntries.
  if (!opts?.excludeTournaments) {
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
      const editionPop = (typeof agg._count === 'object') ? (agg._count._all || 0) : 0;
      entries.push({ path: `/tournaments/${tournamentMap[sid]}/${e.year}`, popularity: editionPop, lastmod });
    }

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
      const hasRecordsRoot = ROOT_ONLY_RECORDS_TOURNAMENT_SLUGS.has(t.slug) || SLAM_RECORDS_TOURNAMENT_SLUGS.has(t.slug);
      if (hasRecordsRoot) {
        entries.push({ path: `${basePath}/records` });
      }
      if (SLAM_RECORDS_TOURNAMENT_SLUGS.has(t.slug)) {
        tournamentRecordSegments.forEach(seg => entries.push({ path: `${basePath}/records/${seg}` }));
      }
    });
  }

  // --- TOURNAMENT EDITIONS ---
  // Tournament editions are excluded from the sections sitemap.
  // Editions (per-year pages) are provided by the tournaments sitemap instead.

  // --- RECORDS DINAMICI ---
  let recordUrls: string[] = [];
  if (!opts?.excludeRecords) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const possibleFiles = ['page.tsx', 'page.ts', 'page.js', 'page.jsx'];
      const pageDir = path.join(process.cwd(), 'app', 'records', '[...slug]');
      let found = false;
      for (const f of possibleFiles) {
        if (fs.existsSync(path.join(pageDir, f))) { found = true; break; }
      }
      if (found) {
        const mod = await import('../app/records/[...slug]/page');
        if (mod && typeof mod.generateStaticParams === 'function') {
          const params = await mod.generateStaticParams();
          if (Array.isArray(params)) {
            recordUrls = params.map((p: any) => (Array.isArray(p.slug) ? `/records/${p.slug.join('/')}` : `/records`)).filter(Boolean);
          }
        }
      }
    } catch (e) {
      console.warn('Could not load dynamic record URLs:', e);
    }
    recordUrls.forEach(r => entries.push({ path: r, lastmod: globalMaxDate, popularity: undefined }));
  }

  // --- API: recordsranking (include API endpoints under app/api/recordsranking) ---
  if (!opts?.excludeRecordsranking) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const apiBase = path.join(process.cwd(), 'app', 'api', 'recordsranking');
      function walk(dir: string, out: string[] = []) {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const p = path.join(dir, item.name);
          if (item.isDirectory()) walk(p, out);
          else if (/^route\.(t|j)sx?$/.test(item.name)) out.push(p);
        }
        return out;
      }
      if (fs.existsSync(apiBase)) {
        const routeFiles = walk(apiBase);
        routeFiles.forEach(f => {
          const rel = path.relative(apiBase, path.dirname(f)).split(path.sep).filter(Boolean);
          const apiPath = '/api/recordsranking' + (rel.length ? '/' + rel.join('/') : '');
          entries.push({ path: apiPath });
        });
      }
    } catch (e) {
      console.warn('Could not gather API recordsranking routes:', e);
    }
  }

  // --- TOURNAMENT RECORDS (excluded) ---
  // Tournament record pages/segments are intentionally omitted from the sections sitemap;
  // they are provided by the tournaments sitemap.

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
  // players should be considered frequently updated
  if (/^\/players(?:\/|$)/.test(path)) return 'daily';
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

export async function generateSitemapXml(opts?: { excludePlayers?: boolean; excludeTournaments?: boolean; excludeRecords?: boolean; excludeRecordsranking?: boolean }) {
  const base = process.env.SITE_URL || 'https://stats.tennismylife.org';
  const entries = await getSitemapEntries(opts);

  // Defensive filter: ensure sections sitemap cannot contain players, tournaments, records or recordsranking
  const filtered = entries.filter(e => {
    if (opts?.excludePlayers && e.path.startsWith('/players')) return false;
    // If excluding tournaments, remove both the top-level '/tournaments' page and any tournament-specific paths
    if (opts?.excludeTournaments && (e.path === '/tournaments' || e.path.startsWith('/tournaments/'))) return false;
    if (opts?.excludeRecords && e.path.startsWith('/records')) return false;
    if (opts?.excludeRecordsranking && (e.path.startsWith('/recordsranking') || e.path.startsWith('/api/recordsranking'))) return false;
    return true;
  });

  // --- GENERATE XML (simple priorities) ---
  const urls = filtered
    .map(e => {
      const lastmodTag = e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>\n` : '';
      const changefreq = computeChangefreq(e.path, { lastmod: e.lastmod });
      const priority = (e.path.includes('/records') || e.path === '/') ? '1.00' : '0.50';
      return `  <url>\n    <loc>${base}${e.path}</loc>\n${lastmodTag}    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}
