const express = require('express');
const zlib = require('zlib');
const crypto = require('crypto');
const { xmlHeaderUrlset, xmlFooterUrlset, xmlHeaderSitemapIndex, xmlFooterSitemapIndex, urlEntry, sitemapEntry } = require('./xml.js');

// Simple JS mocks mirroring TS service
const SITE_ROOT = (process.env.SITE_ROOT || 'https://stats.tennismylife.org').replace(/\/$/, '/') + '/sitemaps';
const MAX_PER_FILE = Number(process.env.MAX_URLS_PER_FILE || 40000);
const EXCLUDE_PREFIXES = (process.env.SITEMAP_EXCLUDE_PREFIXES || 'unknown-,qualifier-').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const CACHE_MAX_AGE = Number(process.env.SITEMAP_CACHE_MAX_AGE || process.env.CACHE_MAX_AGE || 3600);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function* getPlayersForSitemap() {
  // Load all players to allow normalization/dedup (keep canonical base only)
  const rows = await prisma.player.findMany({ select: { id: true, slug: true } });
  const slugSet = new Set(rows.filter(r => r.slug).map(r => String(r.slug).toLowerCase()));

  // popularity / lastmod per player
  const playerIds = rows.map(r => r.id).filter(Boolean);
  const popularityMap = {};
  if (playerIds.length) {
    try {
      const wins = await prisma.match.groupBy({ by: ['winner_id'], _count: { _all: true }, _max: { tourney_date: true }, where: { winner_id: { in: playerIds } } });
      for (const w of wins) {
        if (!w.winner_id) continue;
        const id = String(w.winner_id);
        popularityMap[id] = popularityMap[id] || { count: 0 };
        popularityMap[id].count += w._count?._all || 0;
        if (w._max?.tourney_date) popularityMap[id].lastmod = (new Date(w._max.tourney_date)).toISOString().split('T')[0];
      }
      const losses = await prisma.match.groupBy({ by: ['loser_id'], _count: { _all: true }, _max: { tourney_date: true }, where: { loser_id: { in: playerIds } } });
      for (const l of losses) {
        if (!l.loser_id) continue;
        const id = String(l.loser_id);
        popularityMap[id] = popularityMap[id] || { count: 0 };
        popularityMap[id].count += l._count?._all || 0;
        const ldate = l._max?.tourney_date ? (new Date(l._max.tourney_date)).toISOString().split('T')[0] : undefined;
        if (ldate) {
          const cur = popularityMap[id].lastmod;
          if (!cur || new Date(ldate) > new Date(cur)) popularityMap[id].lastmod = ldate;
        }
      }
    } catch (e) { /* ignore */ }
  }

  function normalizePlayerSlugVariant(slug) {
    if (!slug) return null;
    const s = String(slug).toLowerCase().trim();
    const m1 = s.match(/^(.+?)-[A-Za-z]\d+$/i);
    if (m1) return m1[1];
    const m2 = s.match(/^(.+?)-[A-Za-z0-9]{1,6}$/i);
    if (m2) return m2[1];
    return null;
  }

  const sorted = rows.filter(r => r.slug).map(r => ({ id: r.id, slug: String(r.slug).toLowerCase() })).sort((a,b)=>a.slug.localeCompare(b.slug));
  for (const r of sorted) {
    const slug = r.slug;
    if (!slug) continue;
    if (EXCLUDE_PREFIXES.some(pre => slug.startsWith(pre))) continue;
    const base = normalizePlayerSlugVariant(slug);
    if (base && slugSet.has(base) && base !== slug) continue; // skip variant
    const pop = popularityMap[String(r.id)];
    yield { slug, changefreq: 'daily', priority: '0.50', lastmod: pop?.lastmod };
  }
}

async function* getTournamentsForSitemap() {
  const rows = await prisma.tournament.findMany({ select: { id: true, slug: true } });
  const tSlugSet = new Set(rows.filter(r => r.slug).map(r => String(r.slug).toLowerCase()));

  // popularity / lastmod per tournament
  const tourneyIds = rows.map(r => r.id).filter(Boolean);
  const tourneyMap = {};
  if (tourneyIds.length) {
    try {
      const agg = await prisma.match.groupBy({ by: ['tourney_id'], _count: { _all: true }, _max: { tourney_date: true }, where: { tourney_id: { in: tourneyIds } } });
      for (const a of agg) {
        if (!a.tourney_id) continue;
        const id = String(a.tourney_id);
        tourneyMap[id] = tourneyMap[id] || { count: 0 };
        tourneyMap[id].count += a._count?._all || 0;
        if (a._max?.tourney_date) tourneyMap[id].lastmod = (new Date(a._max.tourney_date)).toISOString().split('T')[0];
      }
    } catch (e) { /* ignore */ }
  }

  function normalizeTournamentSlugVariant(slug) {
    if (!slug) return null;
    const s = String(slug).toLowerCase().trim();
    const m1 = s.match(/^(.+?)-\d+$/);
    if (m1) return m1[1];
    const m2 = s.match(/^(.+?)-[A-Za-z0-9]{1,6}$/i);
    if (m2) return m2[1];
    return null;
  }

  const sorted = rows.filter(r => r.slug).map(r => ({ id: r.id, slug: String(r.slug).toLowerCase() })).sort((a,b)=>a.slug.localeCompare(b.slug));
  for (const r of sorted) {
    const slug = r.slug;
    if (!slug) continue;
    const base = normalizeTournamentSlugVariant(slug);
    if (base && tSlugSet.has(base) && base !== slug) continue;
    const tm = tourneyMap[String(r.id)];
    yield { slug, changefreq: 'weekly', priority: '0.50', lastmod: tm?.lastmod };
  }
}

async function* getSectionUrlsForSitemap() {
  // Yield static pages first (NOTE: tournaments and their editions are intentionally excluded here)
  const sections = ['/', '/records', '/ranking', '/players', '/tennis-match-database', '/h2h', '/statistics', '/seasons', '/forecasts', '/rankingtables'];
  for (const s of sections) yield { loc: s, changefreq: 'weekly', priority: '0.50' };

  // static record pages
  const staticRecordPages = [
    '/records/same/playeddaily', '/records/same/entriesdaily', '/records/same/titlesdaily', '/records/same/rounddaily',
    '/records/seasons/winsdaily','/records/seasons/playeddaily','/records/seasons/entriesdaily','/records/seasons/titlesdaily','/records/seasons/rounddaily','/records/seasons/percentagedaily',
    '/records/atage/winsdaily','/records/atage/playeddaily','/records/atage/entriesdaily','/records/atage/titlesdaily','/records/atage/slamsdaily','/records/atage/rounddaily',
    '/records/ageofnth/winsdaily','/records/ageofnth/playeddaily','/records/ageofnth/entriesdaily','/records/ageofnth/titlesdaily','/records/ageofnth/slamsdaily','/records/ageofnth/rounddaily',
    '/records/neededto/titlesdaily','/records/counterseasons/rounddaily','/records/counterseasons/titlesdaily','/records/streak/winsdaily','/records/streak/rounddaily','/records/h2h/countdaily'
  ];
  for (const r of staticRecordPages) yield { loc: r, changefreq: 'daily', priority: '1.00' };

  // Tournament editions are intentionally excluded from the sections sitemap; they are provided by the tournaments sitemap generator.


  // Dynamic records pages (generateStaticParams) - best-effort
  try {
    const fs = require('fs');
    const path = require('path');
    const pageDir = path.join(process.cwd(), 'app', 'records', '[...slug]');
    const possibleFiles = ['page.tsx','page.ts','page.js','page.jsx'];
    let found = false;
    for (const f of possibleFiles) if (fs.existsSync(path.join(pageDir, f))) { found = true; break; }
    if (found) {
      try {
        const mod = await import(path.join(process.cwd(), 'app','records','[...slug]','page'));
        if (mod && typeof mod.generateStaticParams === 'function') {
          const params = await mod.generateStaticParams();
          if (Array.isArray(params)) {
            for (const p of params) {
              const url = Array.isArray(p.slug) ? `/records/${p.slug.join('/')}` : `/records`;
              yield { loc: url, changefreq: 'daily', priority: '1.00' };
            }
          }
        }
      } catch (e) { /* ignore */ }
    }
  } catch (e) { /* ignore */ }

  // API: recordsranking (scan route files)
  try {
    const fs = require('fs');
    const path = require('path');
    const apiBase = path.join(process.cwd(), 'app', 'api', 'recordsranking');
    function walk(dir, out = []) {
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
  } catch (e) { /* ignore */ }
}

async function* chunkAsync(iter, size) {
  const out = [];
  for await (const it of iter) {
    out.push(it);
    if (out.length >= size) {
      const copy = out.slice();
      out.length = 0;
      yield copy;
    }
  }
  if (out.length) yield out;
}

async function buildSectionPartitions() {
  const map = new Map();
  let idx = 1;
  for await (const page of chunkAsync(getSectionUrlsForSitemap(), MAX_PER_FILE)) {
    const fileName = idx === 1 ? 'sitemap-sections.xml' : `sitemap-sections-${idx}.xml`;
    map.set(fileName, (async function* (pageLocal) {
      yield xmlHeaderUrlset();
      for (const u of pageLocal) yield urlEntry({ loc: (process.env.SITE_ROOT || 'https://stats.tennismylife.org').replace(/\/$/, '') + u.loc, changefreq: u.changefreq, priority: u.priority, lastmod: u.lastmod });
      yield xmlFooterUrlset();
    })(page));
    idx++;
  }
  return map;
}

async function buildPlayerPartitions() {
  const groups = {};
  for await (const p of getPlayersForSitemap()) {
    if (!p || !p.slug) continue;
    const slug = p.slug.toLowerCase();
    if (EXCLUDE_PREFIXES.some(pre => slug.startsWith(pre))) continue;
    const letter = /^[a-z]/i.test(slug) ? slug[0].toUpperCase() : 'misc';
    const key = (letter >= 'A' && letter <= 'Z') ? letter : 'misc';
    groups[key] = groups[key] || [];
    groups[key].push({ slug, changefreq: p.changefreq, priority: p.priority, lastmod: p.lastmod });
  }
  const map = new Map();
  for (const [letter, entries] of Object.entries(groups)) {
    let page = 1;
    for (let i = 0; i < entries.length; i += MAX_PER_FILE) {
      const chunk = entries.slice(i, i + MAX_PER_FILE);
      const fileName = page === 1 ? `sitemap-players-${letter}.xml` : `sitemap-players-${letter}-${page}.xml`;
      map.set(fileName, (async function* (chunkLocal) {
        yield xmlHeaderUrlset();
        for (const s of chunkLocal) yield urlEntry({ loc: (process.env.SITE_ROOT || 'https://stats.tennismylife.org').replace(/\/$/, '') + `/players/${s.slug}`, changefreq: s.changefreq, priority: s.priority, lastmod: s.lastmod });
        yield xmlFooterUrlset();
      })(chunk));
      page++;
    }
  }
  return map;
}

async function buildTournamentPartitions() {
  const groups = {};
  for await (const p of getTournamentsForSitemap()) {
    if (!p || !p.slug) continue;
    const slug = p.slug.toLowerCase();
    const letter = /^[a-z]/i.test(slug) ? slug[0].toUpperCase() : 'misc';
    const key = (letter >= 'A' && letter <= 'Z') ? letter : 'misc';
    groups[key] = groups[key] || [];
    groups[key].push({ slug, changefreq: p.changefreq, priority: p.priority, lastmod: p.lastmod });
  }
  const map = new Map();
  for (const [letter, entries] of Object.entries(groups)) {
    let page = 1;
    for (let i = 0; i < entries.length; i += MAX_PER_FILE) {
      const chunk = entries.slice(i, i + MAX_PER_FILE);
      const fileName = page === 1 ? `sitemap-tournaments-${letter}.xml` : `sitemap-tournaments-${letter}-${page}.xml`;
      map.set(fileName, (async function* (chunkLocal) {
        yield xmlHeaderUrlset();
        for (const s of chunkLocal) {
          yield urlEntry({ loc: (process.env.SITE_ROOT || 'https://stats.tennismylife.org').replace(/\/$/, '') + `/tournaments/${s.slug}`, changefreq: s.changefreq, priority: s.priority, lastmod: s.lastmod });
          yield urlEntry({ loc: (process.env.SITE_ROOT || 'https://stats.tennismylife.org').replace(/\/$/, '') + `/tournaments/${s.slug}/records`, changefreq: 'daily', priority: '1.00', lastmod: s.lastmod });
          const tournamentRecordSegments = ['count/titles','count/wins','count/played','count/entries','percentage/wins','percentage/rounds/R128','percentage/rounds/R64','percentage/rounds/R32','percentage/rounds/R16','percentage/rounds/QF','percentage/rounds/SF','percentage/rounds/F','timespan/rounds/Titles','timespan/rounds/R128','timespan/rounds/R64','timespan/rounds/R32','timespan/rounds/R16','timespan/rounds/QF','timespan/rounds/SF','timespan/rounds/F','roundsonentries/rounds/Winner','roundsonentries/rounds/R32','roundsonentries/rounds/R16','roundsonentries/rounds/QF','roundsonentries/rounds/SF','roundsonentries/rounds/F','least/rounds/R32','least/rounds/R16','least/rounds/QF','least/rounds/SF','least/rounds/F','least/rounds/W','ages/main/youngest','ages/main/oldest','ages/titles/youngest','ages/titles/oldest','ages/youngestrounds/R128','ages/youngestrounds/R64','ages/youngestrounds/R32','ages/youngestrounds/R16','ages/youngestrounds/QF','ages/youngestrounds/SF','ages/youngestrounds/F','ages/oldestrounds/R128','ages/oldestrounds/R64','ages/oldestrounds/R32','ages/oldestrounds/R16','ages/oldestrounds/QF','ages/oldestrounds/SF','ages/oldestrounds/F'];
          for (const seg of tournamentRecordSegments) yield urlEntry({ loc: (process.env.SITE_ROOT || 'https://stats.tennismylife.org').replace(/\/$/, '') + `/tournaments/${s.slug}/records/${seg}`, changefreq: 'daily', priority: '1.00', lastmod: s.lastmod });
        }
        yield xmlFooterUrlset();
      })(chunk));
      page++;
    }
  }
  return map;
}

async function sendXmlStream(req, res, gen, opts = {}) {
  const parts = [];
  for await (const p of gen) parts.push(Buffer.from(p, 'utf8'));
  const full = Buffer.concat(parts);
  const etag = '"' + crypto.createHash('sha1').update(full).digest('hex') + '"';
  if (req.headers['if-none-match'] && req.headers['if-none-match'] === etag) return res.status(304).end();
  const accept = String(req.headers['accept-encoding'] || req.headers['accept'] || '');
  const useGzip = accept.includes('gzip');
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('ETag', etag);
  if (typeof CACHE_MAX_AGE === 'number') res.setHeader('Cache-Control', `public, max-age=${CACHE_MAX_AGE}`);
  if (useGzip) {
    res.setHeader('Content-Encoding', 'gzip');
    const gz = zlib.gzipSync(full, { level: 6 });
    res.setHeader('Content-Length', gz.length.toString());
    res.write(gz);
    res.end();
    return;
  }
  res.setHeader('Content-Length', full.length.toString());
  res.write(full);
  res.end();
}

const router = express.Router();

router.get('/sitemap_index.xml', async (req, res) => {
  const sectionMap = await buildSectionPartitions();
  const playerMap = await buildPlayerPartitions();
  const tournamentMap = await buildTournamentPartitions();
  const files = [...sectionMap.keys(), ...playerMap.keys(), ...tournamentMap.keys()].sort();
  const gen = (async function* () {
    yield xmlHeaderSitemapIndex();
    for (const f of files) {
      const loc = (process.env.SITE_ROOT || 'https://stats.tennismylife.org').replace(/\/$/, '') + `/sitemaps/${f}`;
      yield sitemapEntry({ loc });
    }
    yield xmlFooterSitemapIndex();
  })();
  await sendXmlStream(req, res, gen);
});

router.get('/:fname', async (req, res, next) => {
  try {
    const fname = String(req.params.fname || '');
    const sectionMap = await buildSectionPartitions();
    const playerMap = await buildPlayerPartitions();
    const tournamentMap = await buildTournamentPartitions();
    const maps = new Map([...sectionMap.entries(), ...playerMap.entries(), ...tournamentMap.entries()]);
    if (!maps.has(fname)) return next();
    await sendXmlStream(req, res, maps.get(fname));
  } catch (e) {
    next(e);
  }
});



module.exports = router;
