// server.js — Next.js + Express + Redis v4 + Compression + Cache HIT/MISS
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
const { parse } = require('csv-parse/sync');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const archiver = require('archiver');

const dev = false; // produzione
const nextApp = next({ dev, dir: '.', conf: { distDir: '.next' } });
const handle = nextApp.getRequestHandler();

const CONTROL_PARAMS = new Set(['nocache', 'x-refresh']);
let redis = null;
let activeRequests = 0;

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

process.on('uncaughtException', (err) => {
  console.error('?? Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('?? Unhandled Rejection at:', promise, 'reason:', reason);
});

async function initRedis() {
  try {
    redis = createClient({ url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' });
    redis.on('error', (err) => console.warn('Redis error:', err));
    await redis.connect();
    console.log('Redis connesso ? Cache attiva');
  } catch (err) {
    redis = null;
    console.warn('Redis NON disponibile ? Cache disattivata', err?.message || err);
  }
}

function shouldBypassCache(req) {
  // Bypass solo se NON GET o se nocache/x-refresh
  // Tutte le pagine e API /records saranno cachate ora
  return req.method !== 'GET' || req.query?.nocache || req.headers['x-refresh'] === '1';
}


// nuova funzione: decodifica completa dell'URL
function fullyDecode(url) {
  let prev;
  let decoded = url;
  do {
    prev = decoded;
    decoded = decodeURIComponent(prev);
  } while (decoded !== prev);
  return decoded;
}

function buildCacheKey(req, type) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const url = new URL(`${proto}://${req.headers.host}${req.originalUrl}`);
  const params = new URLSearchParams(url.search);

  const keys = [...params.keys()]
    .filter((k) => !CONTROL_PARAMS.has(k))
    .sort();

  const normalized = new URLSearchParams();
  for (const k of keys) normalized.append(k, params.get(k));

  const qs = normalized.toString();

  // decodifica completa del path per uniformare le chiavi
  const decodedPath = fullyDecode(url.pathname);

  return `tennismylife:${type}:${decodedPath}${qs ? `?${qs}` : ''}`;
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

(async () => {
  await nextApp.prepare();
  await initRedis();

  const server = express();
  server.use(compression({ level: 6, threshold: 1024 }));

  server.use((req, res, next) => {
    activeRequests++;
    res.on('finish', () => { activeRequests--; });
    next();
  });

  server.use((req, res, next) => {
    res.setHeader('X-Cache', 'UNCACHED');
    const sha = safeReadGitSha();
    const buildId = safeReadBuildId();
    if (sha) res.setHeader('X-App-Commit', sha.slice(0, 12));
    if (buildId) res.setHeader('X-App-BuildId', buildId);
    next();
  });

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

  server.use(async (req, res, next) => {
    if (!redis || shouldBypassCache(req)) return next();

    const type = req.path.startsWith('/api') ? 'api' : 'page';
    const key = buildCacheKey(req, type);

    try {
      const cachedStr = await redis.get(key);
      if (!cachedStr) return next();

      const cached = JSON.parse(cachedStr);
      const body = Buffer.from(cached.body, 'base64');

      res.setHeader('Content-Type', cached.type || 'text/html; charset=utf-8');
      try {
        const etag = strongETag(body);
        if (etag) res.setHeader('ETag', etag);
      } catch {}
      res.setHeader('Cache-Control', 'private, max-age=0');
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

  server.use((req, res, next) => {
    if (!redis || shouldBypassCache(req) || res.fromCache) return next();

    const type = req.path.startsWith('/api') ? 'api' : 'page';
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

    res.end = async (chunk, ...args) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));

      try {
        if (res.statusCode === 200) {
          const headers = res.getHeaders();
          const ct = String(headers['content-type'] || '');
          let bodyBuffer = Buffer.concat(chunks);
          bodyBuffer = decompressIfGzip(bodyBuffer, headers);

          if (ct.includes('text/html') && bodyBuffer.length < 512) {
            if (process.env.VERBOSE_LOGS === '1') console.warn('[CACHE SKIP] HTML troppo piccolo', key);
          } else {
            const ttl = req.path.startsWith('/api')
              ? Number(process.env.CACHE_TTL_API || 3600)
              : Number(process.env.CACHE_TTL_PAGE || 900);

            await redis.set(
              key,
              JSON.stringify({ body: bodyBuffer.toString('base64'), type: ct }),
              { EX: ttl }
            );

            if (res.getHeader('X-Cache') === 'UNCACHED') {
              res.setHeader('X-Cache', `${type.toUpperCase()}-STORED`);
            }
            res.setHeader('X-SSR-COMPLETE', '1');
            res.setHeader('Cache-Control', 'private, max-age=0');

            if (process.env.VERBOSE_LOGS === '1') console.log('[CACHE STORED]', key, bodyBuffer.length, 'bytes');
          }
        }
      } catch (e) {
        console.error('[CACHE PROCESS ERROR]', e);
      }

      return originalEnd(chunk, ...args);
    };

    next();
  });

  server.use('/data', express.static(path.join(process.cwd(), 'data'), {
    setHeaders: (res, filePath) => {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    },
  }));

  server.get('/api/matches', async (req, res) => {
    try {
      const qPlayer = (req.query.player || '').toString().trim().toLowerCase();
      const qPlayerId = (req.query.player_id || '').toString().trim();
      const qYear = (req.query.year || '').toString().trim();
      const qSurface = (req.query.surface || '').toString().trim();
      const qRound = (req.query.round || '').toString().trim();

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

      const allFlag = String(req.query.all || '') === '1' || Number(req.query.limit || 1) === 0;
      const limit = Math.min(1000, Number(req.query.limit || 100));
      const offset = Math.max(0, Number(req.query.offset || 0));

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
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).json({ count: count ?? results.length, results });
    } catch (err) {
      console.error('Error in /api/matches', err);
      return res.status(500).json({ error: 'Internal server error reading CSV.' });
    }
  });

  server.get('/api/data-files', async (req, res) => {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) return res.status(404).json({ error: 'data directory not found' });

      const files = fs.readdirSync(dataDir).filter((f) => /\.csv$/i.test(f));
      const proto = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host || 'localhost:3000';
      const base = `${proto}://${host}`;

      const results = files.map((f) => {
        const st = fs.statSync(path.join(dataDir, f));
        return { name: f, url: `${base}/data/${encodeURIComponent(f)}`, size: st.size, mtime: st.mtime.toISOString() };
      });

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).json({ count: results.length, files: results });
    } catch (err) {
      console.error('Error in /api/data-files', err);
      return res.status(500).json({ error: 'Internal server error listing data files.' });
    }
  });

  server.get('/api/download-all', async (req, res) => {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) return res.status(404).send('data directory not found');

      const requested = req.query.files ? req.query.files.toString().split(',').map((s) => s.trim()).filter(Boolean) : null;

      let files = fs.readdirSync(dataDir).filter((f) => /\.csv$/i.test(f));
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

  try {
    server.use('/sitemaps', require('./src/sitemaps/routes.js'));
  } catch (e) {
    console.warn('Sitemaps router not available', e?.message || e);
  }

  server.get('/robots.txt', (req, res) => {
    const siteRoot = (process.env.SITE_ROOT || 'https://stats.tennismylife.org').replace(/\/$/, '/') ;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(`User-agent: *\nAllow: /\nSitemap: ${siteRoot}sitemap_index.xml\n`);
  });

  server.all(/.*/, (req, res) => handle(req, res));

  const PORT = process.env.PORT || 3000;
  const srv = server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server avviato ? http://localhost:${PORT}`);
    console.log(redis ? 'Redis cache attiva' : 'Cache disattivata');
  });

  const shutdown = async (signal) => {
    console.log(`? Shutdown triggered by signal: ${signal}`);
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
