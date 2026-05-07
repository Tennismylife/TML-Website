
// server.js — Next.js + Express + Redis v4 + Compression + Cache HIT/MISS
// v2
// Obiettivo: cache server-side realmente efficace per HTML e API
// - Nessun taglio dei dati (mostri tutto), ma risposte veloci e leggere
// - Chiavi stabili (query ordinata), TTL, niente skip su 'chunked'
// - Bypass per RSC/prefetch (Next App Router) e per richieste con nocache/x-refresh

const express = require('express');
const { createClient } = require('redis');
const next = require('next');
const compression = require('compression');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
// CSV parsing for /api/matches endpoint. Uses csv-parse so we keep CSV reading robust to quoted values.
// Place CSV files in a top-level `data/` directory (see `data/README.md`). These files are served
// from `https://<your-site>/data/<file>.csv` so they remain on the site domain.
const { parse } = require('csv-parse/sync');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
// Archiver to stream ZIPs on-the-fly for bulk download endpoint
const archiver = require('archiver');
const {
  hasRecordsFilterParams,
  resolvePageRecordAndSub,
  resolveRecordApiRequest,
  isExistingRecordApiPath,
  hasMissingRequiredRecordParams,
  hasEmptyRecordData,
} = require('./lib/records/empty-record-pages.cjs');

const dev = false; // produzione
const nextApp = next({ dev, dir: '.', conf: { distDir: '.next' } });
const handle = nextApp.getRequestHandler();

// Parametri di controllo che NON entrano nella cache key
const CONTROL_PARAMS = new Set(['nocache', 'x-refresh']);
let redis = null;
let activeRequests = 0;

/* ---------------- Helpers build info ---------------- */
function safeReadBuildId() {
  try {
    const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');
    if (!fs.existsSync(buildIdPath)) return null;
    return String(fs.readFileSync(buildIdPath, 'utf8') || '').trim() || null;
  } catch {
    return null;
  }
}

function safeReadGitSha() {
  try {
    return String(
      execSync('git rev-parse HEAD', { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'ignore'] }) || ''
    ).trim() || null;
  } catch {
    return null;
  }
}

/* ---------------- Global error handling ---------------- */
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

/* ---------------- Redis init ---------------- */
async function initRedis() {
  try {
    redis = createClient({ url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' });
    redis.on('error', (err) => console.warn('Redis error:', err));
    await redis.connect();
    console.log('Redis connesso ✅ Cache attiva');
  } catch (err) {
    redis = null;
    console.warn('Redis NON disponibile ❌ Cache disattivata', err?.message || err);
  }
}

/* ---------------- Cache utils ---------------- */
function shouldBypassCache(req) {
  // Bypass:
  // - Metodi non GET
  // - Parametri/headers di controllo
  // - RSC/Prefetch/App Router (content-negotiation testo x-component)
  const accept = String(req.headers['accept'] || '');
  const isRsc =
    req.headers['rsc'] === '1' ||
    typeof req.headers['next-router-state-tree'] !== 'undefined' ||
    typeof req.headers['next-router-prefetch'] !== 'undefined' ||
    typeof req.headers['next-router-segment-prefetch'] !== 'undefined' ||
    accept.includes('text/x-component');

  return (
    req.method !== 'GET' ||
    req.query?.nocache ||
    req.headers['x-refresh'] === '1' ||
    isRsc
  );
}

function buildCacheKey(req, type) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const url = new URL(`${proto}://${req.headers.host}${req.originalUrl}`);
  const params = new URLSearchParams(url.search);

  // Normalizza: rimuovi parametri di controllo e ORDINA le chiavi per stabilità
  // Usa getAll per gestire correttamente i parametri multi-valore (es. surface=Clay&surface=Hard)
  const keys = [...new Set([...params.keys()])]
    .filter((k) => !CONTROL_PARAMS.has(k))
    .sort();

  const normalized = new URLSearchParams();
  for (const k of keys) {
    // getAll restituisce tutti i valori per la chiave; ordiniamo per stabilità della cache key
    const vals = params.getAll(k).slice().sort();
    for (const v of vals) normalized.append(k, v);
  }

  const qs = normalized.toString();
  return `tennismylife:${type}:${req.path}${qs ? `?${qs}` : ''}`;
}

function decompressIfGzip(buffer, headers) {
  const enc = (headers && (headers['content-encoding'] || headers['Content-Encoding'])) || '';
  if (String(enc).includes('gzip')) {
    try { return zlib.gunzipSync(buffer); } catch { return buffer; }
  }
  return buffer;
}

function strongETag(buffer) {
  try {
    return '"' + crypto.createHash('sha1').update(buffer).digest('hex') + '"';
  } catch { return undefined; }
}

/* ---------------- Bootstrap ---------------- */
(async () => {
  await nextApp.prepare();
  await initRedis();

  const server = express();

  // ⚠️ NON registrare express.json() globalmente: Next ha bisogno del raw body per i suoi handler

  /* 1) Compressione Gzip (PRIMA dei middleware di cache) */
  server.use(compression({ level: 6, threshold: 1024 }));

  /* 2) Active requests counter (silenced) */
  server.use((req, res, next) => {
    activeRequests++;
    res.on('finish', () => { activeRequests--; });
    next();
  });

  /* 3) Header informativi */
  server.use((req, res, next) => {
    res.setHeader('X-Cache', 'UNCACHED');
    const sha = safeReadGitSha();
    const buildId = safeReadBuildId();
    if (sha) res.setHeader('X-App-Commit', sha.slice(0, 12));
    if (buildId) res.setHeader('X-App-BuildId', buildId);
    next();
  });

  /* 4) Version endpoint */
  server.get('/_version', (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).send(JSON.stringify({
      commit: safeReadGitSha(),
      buildId: safeReadBuildId(),
      node: process.version,
      env: process.env.NODE_ENV || null,
      time: new Date().toISOString(),
    }));
  });

  /* 4.5) Records pages with valid filters but empty data -> 410 */
  server.use(async (req, res, next) => {
    if (req.method !== 'GET') return next();
    if (!req.path.startsWith('/records/')) return next();
    if (shouldBypassCache(req)) return next();

    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const pageUrl = new URL(`${proto}://${req.headers.host}${req.originalUrl}`);
    if (!hasRecordsFilterParams(pageUrl.searchParams)) return next();

    const { record, sub } = resolvePageRecordAndSub(req.path);
    if (!record) return next();

    try {
      const apiRequest = resolveRecordApiRequest(record, sub, pageUrl.searchParams);
      if (!isExistingRecordApiPath(apiRequest.pathname)) return next();
      if (hasMissingRequiredRecordParams(record, sub, apiRequest.searchParams)) return next();
      const apiUrl = new URL(apiRequest.pathname, `${proto}://${req.headers.host}`);
      apiRequest.searchParams.forEach((value, key) => {
        apiUrl.searchParams.append(key, value);
      });

      const apiResp = await fetch(apiUrl.toString(), {
        headers: { 'x-refresh': '1', accept: 'application/json' },
      });

      if (!apiResp.ok) return next();

      const payload = await apiResp.json();
      if (!hasEmptyRecordData(payload)) return next();

      res.setHeader('Cache-Control', 'private, max-age=0');
      res.setHeader('X-SSR-COMPLETE', '1');
      return res.status(410).send('Gone');
    } catch (error) {
      console.error('[RECORDS EMPTY CHECK ERROR]', error);
      return next();
    }
  });

  /* 4.9) Redirect numeric tournament IDs AND player legacy codes BEFORE cache read.
   * The Redis cache may serve stale 200 responses for URLs like /tournaments/405/1981
   * or /players/L018/grass that should redirect to the canonical slug. Since cache
   * reads bypass Next.js middleware, we must intercept here.
   */
  const legacyCodePattern = /^[A-Za-z]+\d+$/i;
  server.use(async (req, res, next) => {
    if (req.method !== 'GET') return next();
    const segments = req.path.split('/').filter(Boolean);
    const resource = segments[0];
    if (resource !== 'players' && resource !== 'tournaments') return next();
    const idSegment = segments[1];
    if (!idSegment) return next();
    const isNumeric = /^\d+$/.test(idSegment);
    const isLegacy = legacyCodePattern.test(idSegment);
    if (!isNumeric && !isLegacy) return next();
    const rest = segments.slice(2).join('/');
    try {
      let slug = null;
      if (resource === 'tournaments' && isNumeric) {
        const t = await prisma.tournament.findUnique({ where: { id: parseInt(idSegment, 10) }, select: { slug: true } });
        slug = t?.slug || null;
      } else if (resource === 'players' && isLegacy) {
        // Player IDs in DB are legacy codes (e.g. L018, SD32), not numeric
        const p = await prisma.player.findUnique({ where: { id: idSegment }, select: { slug: true } });
        slug = p?.slug || null;
      }
      if (slug && slug !== idSegment) {
        const qs = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
        const dest = `/${resource}/${slug}${rest ? '/' + rest : ''}${qs}`;
        return res.redirect(308, dest);
      }
    } catch (e) {
      console.error('[LEGACY ID REDIRECT ERROR]', e);
    }
    return next();
  });

  /* 5) CACHE READ */
  server.use(async (req, res, next) => {
    if (!redis || shouldBypassCache(req)) return next();

    const type = req.path.startsWith('/api') ? 'api' : 'page';
    const key = buildCacheKey(req, type);

    try {
      const cachedStr = await redis.get(key);
      if (!cachedStr) return next();

      const cached = JSON.parse(cachedStr);
      const body = Buffer.from(cached.body, 'base64');

      // Header minimi: tipo, ETag, marker, cache-control (no client cache hard)
      res.setHeader('Content-Type', cached.type || 'text/html; charset=utf-8');
      try {
        const etag = strongETag(body);
        if (etag) res.setHeader('ETag', etag);
      } catch {}
      res.setHeader('Cache-Control', type === 'page' ? 'public, max-age=0, s-maxage=900, stale-while-revalidate=86400' : 'private, max-age=0');
      res.setHeader('X-Cache', `${type.toUpperCase()}-HIT`);
      res.setHeader('X-SSR-COMPLETE', '1');

      res.fromCache = true;
      if (process.env.VERBOSE_LOGS === '1') console.log('[CACHE HIT]', key, body.length, 'bytes');

      return res.send(body);
    } catch (e) {
      console.error('[CACHE READ ERROR]', e);
      return next();
    }
  });

  /* 6) CACHE WRITE */
  server.use((req, res, next) => {
    if (!redis || shouldBypassCache(req) || res.fromCache) return next();

    const type = req.path.startsWith('/api') ? 'api' : 'page';

    // Non cachiamo asset statici (Next già gestisce) e, salvo override, non la homepage
    if (type === 'page' && req.path === '/' && process.env.CACHE_HOME !== '1') return next();
    if (req.path.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|map)$/i)) return next();

    const key = buildCacheKey(req, type);
    const chunks = [];
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    res.write = (chunk, ...args) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return originalWrite(chunk, ...args);
    };

    res.end = (chunk, ...args) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));

      // Collect response metadata synchronously before the response is finalized
      const statusCode = res.statusCode;
      const headers = res.getHeaders();
      const ct = String(headers['content-type'] || '');

      // Set diagnostic/cache headers synchronously (only if headers not yet sent)
      if (statusCode === 200 && !res.headersSent) {
        if (res.getHeader('X-Cache') === 'UNCACHED') {
          res.setHeader('X-Cache', `${type.toUpperCase()}-STORED`);
        }
        res.setHeader('X-SSR-COMPLETE', '1');
        res.setHeader('Cache-Control', type === 'page' ? 'public, max-age=0, s-maxage=900, stale-while-revalidate=86400' : 'private, max-age=0');
      }

      // End the response synchronously so we never double-end
      const result = originalEnd(chunk, ...args);

      // Store in Redis asynchronously (fire-and-forget — never blocks the response)
      if (statusCode === 200) {
        (async () => {
          try {
            let bodyBuffer = Buffer.concat(chunks);
            bodyBuffer = decompressIfGzip(bodyBuffer, headers);

            // Facoltativo: per HTML, scarta body minuscoli (render parziale)
            if (ct.includes('text/html') && bodyBuffer.length < 512) {
              if (process.env.VERBOSE_LOGS === '1') console.warn('[CACHE SKIP] HTML troppo piccolo', key);
            } else if (
              // Non cachare le pagine surface con zero stats: succede quando la
              // try/catch in surfacePageFactory torna silenziosamente con totalMatches=0
              // (es. DB timeout durante import). Il testo "too small a sample" è nel
              // payload RSC e indica una render de-facto vuota → non mettere in cache
              // per evitare che Googlebot veda la versione priva di contenuto.
              ct.includes('text/html') &&
              /\/players\/[^\/]+\/(clay|hard|grass)$/.test(req.path) &&
              bodyBuffer.indexOf(Buffer.from('too small a sample')) !== -1
            ) {
              console.warn('[CACHE SKIP] Zero-stats surface page, non caching', key);
            } else {
              // TTL configurabili
              const ttl = req.path.startsWith('/api')
                ? Number(process.env.CACHE_TTL_API || 3600)   // 1h API
                : Number(process.env.CACHE_TTL_PAGE || 900);  // 15m HTML

              await redis.set(
                key,
                JSON.stringify({ body: bodyBuffer.toString('base64'), type: ct }),
                { EX: ttl }
              );

              if (process.env.VERBOSE_LOGS === '1') console.log('[CACHE STORED]', key, bodyBuffer.length, 'bytes');
            }
          } catch (e) {
            console.error('[CACHE PROCESS ERROR]', e);
          }
        })();
      }

      return result;
    };

    next();
  });

  /* --------------------------------------------
     Serve CSVs from /data and expose /api/matches
     --------------------------------------------
     - CSV files should be placed in the project `data/` directory (not GitHub). Example:
         data/matches.csv
         data/players.csv
         data/rankings.csv
     - Files in `data/` are served directly from the site domain at `/data/<file>.csv`.
     - API `/api/matches` reads and parses `data/matches.csv` and supports query params:
         player=<substring>, year=<YYYY>, surface=<surface>
       Returns JSON with `count` and `results` (array of row objects). See comments below for
       extension points (limit, offset, more filters).
  */

  // Serve CSVs as downloadable files from /data
  server.use(
    '/data',
    express.static(path.join(process.cwd(), 'data'), {
      // Hint browsers to download by default (optional); content-disposition used for convenience
      setHeaders: (res, filePath) => {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        // Optional: force download behavior on browsers
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
      },
    })
  );

  // API: /api/matches
  server.get('/api/matches', async (req, res) => {
    try {
      // Query parameters: player (substring, case-insensitive), player_id (exact id), year (YYYY), surface (case-insensitive), round
      const qPlayer = (req.query.player || '').toString().trim().toLowerCase();
      const qPlayerId = (req.query.player_id || '').toString().trim();
      const qYear = (req.query.year || '').toString().trim();
      const qSurface = (req.query.surface || '').toString().trim();
      const qRound = (req.query.round || '').toString().trim();

      // Build Prisma where clause and query the DB (never read CSVs)
      const where = {};
      if (qPlayerId) {
        where.OR = [{ winner_id: qPlayerId }, { loser_id: qPlayerId }];
      } else if (qPlayer) {
        where.OR = [
          { winner_name: { contains: qPlayer, mode: 'insensitive' } },
          { loser_name: { contains: qPlayer, mode: 'insensitive' } },
        ];
      }
      if (qRound) where.round = qRound;
      if (qSurface) where.surface = qSurface;
      if (qYear) {
        const y = Number(qYear);
        if (Number.isFinite(y)) {
          const from = new Date(`${y}-01-01T00:00:00Z`).toISOString();
          const to = new Date(`${y + 1}-01-01T00:00:00Z`).toISOString();
          where.tourney_date = { gte: from, lt: to };
        }
      }

      // Support ?all=1 (return all filtered results) or limit=0
      const allFlag = String(req.query.all || '') === '1' || Number(req.query.limit || 1) === 0;
      // Optional pagination (limit, offset)
      const limit = Math.min(1000, Number(req.query.limit || 100)); // safety cap
      const offset = Math.max(0, Number(req.query.offset || 0));

      // Only select commonly used fields to keep payload compact
      const select = {
        id: true,
        year: true,
        round: true,
        surface: true,
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        loser_id: true,
        loser_name: true,
        loser_ioc: true,
        score: true,
        status: true,
        tourney_name: true,
        tourney_level: true,
        team_event: true,
        tourney_date: true,
      };

      const count = await prisma.match.count({ where });
      if (allFlag) {
        if (count > Number(process.env.MAX_MATCHES_JSON || 200000)) {
          return res.status(413).json({ error: `Result too large (${count}). Narrow filters or use pagination.` });
        }
        const results = await prisma.match.findMany({ where, orderBy: { tourney_date: 'desc' }, select });
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(200).json({ count, results });
      }

      const results = await prisma.match.findMany({ where, take: limit, skip: offset, orderBy: { tourney_date: 'desc' }, select });
      // continue to pagination handling below by creating a 'filtered-like' response
      const filtered = results;
      const totalCount = count;



      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).json({ count: totalCount ?? filtered.length, results: filtered });
    } catch (err) {
      console.error('Error in /api/matches', err);
      return res.status(500).json({ error: 'Internal server error reading CSV.' });
    }
  });

  // API: /api/data-files — returns list of CSV files available in /data
  server.get('/api/data-files', async (req, res) => {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) return res.status(404).json({ error: 'data directory not found' });

      const proto = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host || 'localhost:3000';
      const base = `${proto}://${host}`;

      const walkCsvFiles = (dir, rootDir) => {
        const items = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            items.push(...walkCsvFiles(fullPath, rootDir));
          } else if (entry.isFile() && /\.csv$/i.test(entry.name)) {
            const relativePath = path.relative(rootDir, fullPath).split(path.sep).join('/');
            items.push({ name: relativePath, path: fullPath });
          }
        }
        return items;
      };

      const files = walkCsvFiles(dataDir, dataDir);
      const results = files.map(({ name, path: fullPath }) => {
        const st = fs.statSync(fullPath);
        const encoded = name.split('/').map(encodeURIComponent).join('/');
        return { name, url: `${base}/data/${encoded}`, size: st.size, mtime: st.mtime.toISOString() };
      });

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).json({ count: results.length, files: results });
    } catch (err) {
      console.error('Error in /api/data-files', err);
      return res.status(500).json({ error: 'Internal server error listing data files.' });
    }
  });

  // API: /api/download-all — create a ZIP on-the-fly containing all or selected CSVs
  server.get('/api/download-all', async (req, res) => {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) return res.status(404).send('data directory not found');

      const walkCsvFiles = (dir, rootDir) => {
        const items = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            items.push(...walkCsvFiles(fullPath, rootDir));
          } else if (entry.isFile() && /\.csv$/i.test(entry.name)) {
            const relativePath = path.relative(rootDir, fullPath).split(path.sep).join('/');
            items.push(relativePath);
          }
        }
        return items;
      };

      // Optional query parameter `files=name1.csv,name2.csv` to include a subset
      const requested = req.query.files ? req.query.files.toString().split(',').map((s) => s.trim()).filter(Boolean) : null;

      let files = walkCsvFiles(dataDir, dataDir);
      if (requested && requested.length) {
        files = files.filter((f) => requested.includes(f));
      }

      if (files.length === 0) return res.status(404).send('No CSV files to include in ZIP');

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="tml-data.zip"');

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', (err) => {
        console.error('Archive error', err);
        if (!res.headersSent) res.status(500).end();
      });

      // Pipe archive data to the response
      archive.pipe(res);

      for (const f of files) {
        const p = path.join(dataDir, f);
        archive.file(p, { name: f });
      }

      await archive.finalize();
    } catch (err) {
      console.error('Error in /api/download-all', err);
      return res.status(500).send('Internal server error creating ZIP');
    }
  });

  // Sitemaps endpoints (if available)
  try {
    server.use('/sitemaps', require('./src/sitemaps/routes.js'));
  } catch (e) {
    console.warn('Sitemaps router not available', e?.message || e);
  }

  // robots.txt — serve from public/robots.txt
  server.get('/robots.txt', (req, res) => {
    const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    if (fs.existsSync(robotsPath)) {
      return res.sendFile(robotsPath);
    }
    return res.status(404).send('robots.txt not found');
  });

  /* 7) Next.js fallback */
  server.all(/.*/, (req, res) => handle(req, res));

  /* 8) Start server */
  const PORT = process.env.PORT || 3000;
  const srv = server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server avviato ✅ http://localhost:${PORT}`);
    console.log(redis ? 'Redis cache attiva' : 'Cache disattivata');
  });

  /* 9) Graceful shutdown */
  const shutdown = async (signal) => {
    console.log(`⚠️  Shutdown triggered by signal: ${signal}`);
    console.log(`Active requests at shutdown: ${activeRequests}`);
    srv.close(() => console.log('Server chiuso'));
    if (redis) {
      try { await redis.quit(); console.log('Redis disconnesso'); } catch {}
    }
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
})();
