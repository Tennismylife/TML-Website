export const SITE_ROOT = (process.env.SITE_ROOT || 'https://stats.tennismylife.org').replace(/\/$/, '/') ;
export const MAX_PER_FILE = Number(process.env.MAX_URLS_PER_FILE || 40000);
export const EXCLUDE_PREFIXES = (process.env.SITEMAP_EXCLUDE_PREFIXES || 'unknown-,qualifier-').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
export const CACHE_MAX_AGE = Number(process.env.SITEMAP_CACHE_MAX_AGE || process.env.CACHE_MAX_AGE || 3600);

// Placeholder async iterables (MOCK). TODO: replace with Prisma-based streaming queries.
import { prisma } from '@/lib/prisma';

export async function* getPlayersForSitemap(): AsyncIterable<{ slug: string; changefreq?: string; priority?: string; lastmod?: string }> {
  // Load full list of players (ids + slugs) to enable normalization/deduplication
  const players = await prisma.player.findMany({ select: { id: true, slug: true } });
  const slugSet = new Set(players.filter(p => p.slug).map(p => String(p.slug).toLowerCase()));

  // Build popularity/lastmod map using groupBy
  const playerIds = players.map(p => p.id).filter(Boolean);
  const popularityMap: Record<string, { count: number; lastmod?: string }> = {};
  if (playerIds.length) {
    try {
      const wins = await prisma.match.groupBy({ by: ['winner_id'], _count: { _all: true }, _max: { tourney_date: true }, where: { winner_id: { in: playerIds } } as any });
      for (const w of wins) {
        if (!w.winner_id) continue;
        popularityMap[String(w.winner_id)] = popularityMap[String(w.winner_id)] || { count: 0 };
        popularityMap[String(w.winner_id)].count += w._count?._all || 0;
        if (w._max?.tourney_date) popularityMap[String(w.winner_id)].lastmod = (new Date(w._max.tourney_date)).toISOString().split('T')[0];
      }
      const losses = await prisma.match.groupBy({ by: ['loser_id'], _count: { _all: true }, _max: { tourney_date: true }, where: { loser_id: { in: playerIds } } as any });
      for (const l of losses) {
        if (!l.loser_id) continue;
        popularityMap[String(l.loser_id)] = popularityMap[String(l.loser_id)] || { count: 0 };
        popularityMap[String(l.loser_id)].count += l._count?._all || 0;
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

  const { normalizePlayerSlugVariant } = await import('@/lib/utils');

  // Yield canonical slugs only (normalize variants like name-D214 -> name if base exists)
  const sorted = players.filter(p => p.slug).map(p => ({ id: p.id, slug: String(p.slug).toLowerCase() })).sort((a, b) => a.slug.localeCompare(b.slug));
  for (const p of sorted) {
    const slug = p.slug;
    if (!slug) continue;
    if (EXCLUDE_PREFIXES.some(pre => slug.startsWith(pre))) continue;
    const base = normalizePlayerSlugVariant(slug);
    if (base && slugSet.has(base) && base !== slug) continue; // skip variant if base exists
    const pop = popularityMap[String(p.id)];
    yield { slug, changefreq: 'daily', priority: '0.50', lastmod: pop?.lastmod };
  }
} 

export async function* getSectionUrlsForSitemap(): AsyncIterable<{ loc: string; changefreq?: string; priority?: string; lastmod?: string }> {
  // Note: tournaments and tournament editions are intentionally excluded here.
  // They are handled by the dedicated tournaments sitemap generator.
  const sections = ['/', '/records', '/ranking', '/players', '/tennis-match-database', '/h2h', '/statistics', '/seasons', '/forecasts', '/rankingtables'];
  for (const s of sections) yield { loc: s, changefreq: 'weekly', priority: '0.50' };

  // --- Static records pages (as in legacy generator)
  const staticRecordPages = [
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
  for (const r of staticRecordPages) yield { loc: r, changefreq: 'daily', priority: '1.00' };

  // Dynamic records pages (generateStaticParams)
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
      try {
        const modulePath = path.join(process.cwd(), 'app', 'records', '[...slug]', 'page');
        const mod = await import(modulePath as any);
        if (mod && typeof mod.generateStaticParams === 'function') {
          const params = await mod.generateStaticParams();
          if (Array.isArray(params)) {
            for (const p of params) {
              const url = Array.isArray(p.slug) ? `/records/${p.slug.join('/')}` : `/records`;
              yield { loc: url, changefreq: 'daily', priority: '1.00', lastmod: undefined };
            }
          }
        }
      } catch (e) {
        // ignore dynamic import errors
      }
    }
  } catch (e) {
    // ignore
  }

  // API: recordsranking (include API endpoints under app/api/recordsranking)
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
      for (const f of routeFiles) {
        const rel = path.relative(apiBase, path.dirname(f)).split(path.sep).filter(Boolean);
        const apiPath = '/api/recordsranking' + (rel.length ? '/' + rel.join('/') : '');
        yield { loc: apiPath, changefreq: 'weekly', priority: '0.50' };
      }
    }
  } catch (e) {
    // ignore
  }
}
