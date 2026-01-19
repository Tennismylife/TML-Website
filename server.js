
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
  const keys = [...params.keys()]
    .filter((k) => !CONTROL_PARAMS.has(k))
    .sort();

  const normalized = new URLSearchParams();
  for (const k of keys) normalized.append(k, params.get(k));

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

    res.end = async (chunk, ...args) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));

      try {
        if (res.statusCode === 200) {
          const headers = res.getHeaders();
          const ct = String(headers['content-type'] || '');

          // Abbiamo già catturato tutto il body: anche se la sorgente era "chunked", ora è completo
          let bodyBuffer = Buffer.concat(chunks);
          bodyBuffer = decompressIfGzip(bodyBuffer, headers);

          // Facoltativo: per HTML, scarta body minuscoli (render parziale)
          if (ct.includes('text/html') && bodyBuffer.length < 512) {
            if (process.env.VERBOSE_LOGS === '1') console.warn('[CACHE SKIP] HTML troppo piccolo', key);
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
