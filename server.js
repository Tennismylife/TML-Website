// server.js — Next.js + Redis v4 + logging avanzato
// Sicurezza massima: homepage NON cachata, asset statici esclusi

const express = require('express');
const { createClient } = require('redis');
const next = require('next');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dev = false;
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
    return String(execSync('git rev-parse HEAD', { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'ignore'] }) || '').trim() || null;
  } catch {
    return null;
  }
}

/* ---------------- GLOBAL ERROR HANDLING ---------------- */
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

/* ---------------- Redis init ---------------- */
async function initRedis() {
  try {
    redis = createClient({ url: 'redis://127.0.0.1:6379' });
    redis.on('error', err => console.warn('Redis error:', err));
    await redis.connect();
    console.log('Redis connesso ✅ Cache attiva');
  } catch (err) {
    redis = null;
    console.warn('Redis NON disponibile ❌ Cache disattivata', err);
  }
}

/* ---------------- Utils ---------------- */
function shouldBypassCache(req) {
  // Next.js App Router uses special headers for Flight/RSC navigation and prefetch.
  // Those responses are content-negotiated (HTML vs text/x-component) and must not
  // be served from the same HTML cache key, otherwise client navigation can break
  // and appear to "stick" to the first rendered page.
  const accept = String(req.headers['accept'] || '');
  const isRsc =
    req.headers['rsc'] === '1' ||
    typeof req.headers['next-router-state-tree'] !== 'undefined' ||
    typeof req.headers['next-router-prefetch'] !== 'undefined' ||
    accept.includes('text/x-component');

  return req.method !== 'GET' || req.query.nocache || req.headers['x-refresh'] === '1' || isRsc;
}

function buildCacheKey(req, type) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const url = new URL(`${proto}://${req.headers.host}${req.originalUrl}`);
  const params = new URLSearchParams(url.search);
  const normalized = new URLSearchParams();

  for (const k of [...params.keys()].filter(k => !CONTROL_PARAMS.has(k))) {
    normalized.append(k, params.get(k));
  }

  const qs = normalized.toString();
  return `tennismylife:${type}:${req.path}${qs ? `?${qs}` : ''}`;
}

function decompressIfGzip(buffer, headers) {
  if (headers && headers['content-encoding'] === 'gzip') {
    try { return zlib.gunzipSync(buffer); } catch { return buffer; }
  }
  return buffer;
}

/* ---------------- Bootstrap ---------------- */
(async () => {
  await nextApp.prepare();
  await initRedis();

  const server = express();
  server.use(express.json());

  /* ---------------- ACTIVE REQUESTS (silenced) ---------------- */
  server.use((req, res, next) => {
    activeRequests++;
    // Active request counters are maintained but per-request console logs removed to reduce noise

    res.on('finish', () => {
      activeRequests--;
      // logging intentionally omitted
    });

    next();
  });

  /* Header sempre presente */
  server.use((req, res, next) => {
    res.setHeader('X-Cache', 'UNCACHED');
    const sha = safeReadGitSha();
    const buildId = safeReadBuildId();
    if (sha) res.setHeader('X-App-Commit', sha.slice(0, 12));
    if (buildId) res.setHeader('X-App-BuildId', buildId);
    next();
  });

  // Minimal version endpoint for production verification
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

  /* ---------------- CACHE READ ---------------- */
  server.use(async (req, res, next) => {
    if (!redis || shouldBypassCache(req)) return next();

    const type = req.path.startsWith('/api') ? 'api' : 'page';
    const key = buildCacheKey(req, type);

    try {
      const cachedStr = await redis.get(key);
      if (!cachedStr) return next();

      const cached = JSON.parse(cachedStr);
      const body = Buffer.from(cached.body, 'base64');

      res.setHeader('Content-Type', cached.type);
      res.setHeader('Cache-Control', 'private, max-age=0');
      res.setHeader('X-Cache', `${type.toUpperCase()}-HIT`);
      res.setHeader('X-SSR-COMPLETE', '1');

      res.fromCache = true;
      console.log('[CACHE HIT]', key, body.length);

      return res.send(body);
    } catch (e) {
      console.error('[CACHE READ ERROR]', e);
      return next();
    }
  });

  /* ---------------- CACHE WRITE ---------------- */
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

    res.end = (chunk, ...args) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));

      try {
        if (res.statusCode === 200) {
          const headers = res.getHeaders();
          const ct = headers['content-type'] || '';

          if (
            headers['transfer-encoding'] === 'chunked' ||
            ct.includes('text/x-component') ||
            ct.includes('application/octet-stream')
          ) {
            return originalEnd(chunk, ...args);
          }

          let bodyBuffer = Buffer.concat(chunks);
          bodyBuffer = decompressIfGzip(bodyBuffer, headers);

          if (ct.includes('text/html')) {
            const html = bodyBuffer.toString('utf-8');
            if (!html.includes('__NEXT_DATA__')) {
              console.warn('[CACHE SKIP] HTML incompleto', key);
              return originalEnd(chunk, ...args);
            }
          }

          redis.set(
            key,
            JSON.stringify({ body: bodyBuffer.toString('base64'), type: ct })
          )
            .then(() => console.log('[CACHE STORED]', key, bodyBuffer.length))
            .catch(err => console.error('[CACHE WRITE ERROR]', err));

          if (res.getHeader('X-Cache') === 'UNCACHED') {
            res.setHeader('X-Cache', `${type.toUpperCase()}-STORED`);
          }
          res.setHeader('X-SSR-COMPLETE', '1');
          res.setHeader('Cache-Control', 'private, max-age=0');
        }
      } catch (e) {
        console.error('[CACHE PROCESS ERROR]', e);
      }

      return originalEnd(chunk, ...args);
    };

    next();
  });

  /* ---------------- GA4 FALLBACK ENDPOINT ---------------- */
  // In-memory fallback stats (used when Redis is unavailable)
  const ga4Stats = { received: {}, forward_ok: {}, forward_fail: {} };

  // POST /ga4-fallback
  // Accepts: { page_path, page_title, referrer, user_agent }
  // Uses `lib/ga4-fallback.js` to generate/reuse HttpOnly cookie and forward the event
  const { handleGa4Fallback } = require('./lib/ga4-fallback');

  server.post('/ga4-fallback', async (req, res) => {
    if (!req.body || !req.body.page_path) return res.status(400).json({ error: 'missing page_path' });
    // Increment 'received' counters (Redis if available, otherwise in-memory)
    try {
      if (redis) await redis.hIncrBy('ga4_fallback:stats', `received:${req.path}`, 1);
      else ga4Stats.received[req.path] = (ga4Stats.received[req.path] || 0) + 1;
    } catch (e) {
      console.warn('[GA4-STATS] increment receive failed', e && e.message);
    }

    if (process.env.GA4_FALLBACK_DEBUG === '1') {
      const shortUa = String(req.body?.user_agent || req.headers['user-agent'] || '').slice(0,120);
      console.debug('[GA4-FALLBACK] recv', { path: req.path, page_path: req.body?.page_path, ip: req.ip || req.connection?.remoteAddress, ua: shortUa });
    }

    // Delegate to the isolated handler and pass optional stats handles
    return handleGa4Fallback(req, res, { redis, inMemoryStats: ga4Stats });
  });

  // Alias endpoint with a very neutral path to evade adblockers that filter requests
  // by URL tokens (e.g. 'ga', 'analytics', 'google'). This additional route points to
  // the same handler — minimal and backwards-compatible change.
  server.post('/_events/collect', async (req, res) => {
    if (!req.body || !req.body.page_path) return res.status(400).json({ error: 'missing page_path' });
    try {
      if (redis) await redis.hIncrBy('ga4_fallback:stats', `received:${req.path}`, 1);
      else ga4Stats.received[req.path] = (ga4Stats.received[req.path] || 0) + 1;
    } catch (e) {
      console.warn('[GA4-STATS] increment receive failed', e && e.message);
    }

    if (process.env.GA4_FALLBACK_DEBUG === '1') {
      const shortUa = String(req.body?.user_agent || req.headers['user-agent'] || '').slice(0,120);
      console.debug('[GA4-FALLBACK] recv', { path: req.path, page_path: req.body?.page_path, ip: req.ip || req.connection?.remoteAddress, ua: shortUa });
    }

    return handleGa4Fallback(req, res, { redis, inMemoryStats: ga4Stats });
  });

  // Very neutral alias `/p` — extremely short and unlikely to be blocked by pattern-based filters
  server.post('/p', async (req, res) => {
    if (!req.body || !req.body.page_path) return res.status(400).json({ error: 'missing page_path' });
    try {
      if (redis) await redis.hIncrBy('ga4_fallback:stats', `received:${req.path}`, 1);
      else ga4Stats.received[req.path] = (ga4Stats.received[req.path] || 0) + 1;
    } catch (e) {
      console.warn('[GA4-STATS] increment receive failed', e && e.message);
    }

    if (process.env.GA4_FALLBACK_DEBUG === '1') {
      const shortUa = String(req.body?.user_agent || req.headers['user-agent'] || '').slice(0,120);
      console.debug('[GA4-FALLBACK] recv', { path: req.path, page_path: req.body?.page_path, ip: req.ip || req.connection?.remoteAddress, ua: shortUa });
    }

    return handleGa4Fallback(req, res, { redis, inMemoryStats: ga4Stats });
  });

  // Image beacon: 1x1 GIF to support clients that block XHR/fetch/beacon
  const { serveGif } = require('./lib/ga4-fallback');
  server.get('/p.gif', (req, res) => {
    // Increment receive counter for diagnostics
    try {
      if (redis) redis.hIncrBy('ga4_fallback:stats', `received:${req.path}`, 1).catch(() => {});
      else ga4Stats.received[req.path] = (ga4Stats.received[req.path] || 0) + 1;
    } catch (e) {}

    if (process.env.GA4_FALLBACK_DEBUG === '1') {
      const shortUa = String(req.headers['user-agent'] || '').slice(0,120);
      console.debug('[GA4-FALLBACK] gif recv', { path: req.path, page_path: req.query && req.query.page_path, ip: req.ip || req.connection?.remoteAddress, ua: shortUa });
    }

    return serveGif(req, res);
  });

  // Additional neutral alias `/r` and `/r.gif` used for aggressive AdBlock rules testing
  server.post('/r', async (req, res) => {
    if (!req.body || !req.body.page_path) return res.status(400).json({ error: 'missing page_path' });
    try {
      if (redis) await redis.hIncrBy('ga4_fallback:stats', `received:${req.path}`, 1);
      else ga4Stats.received[req.path] = (ga4Stats.received[req.path] || 0) + 1;
    } catch (e) {
      console.warn('[GA4-STATS] increment receive failed', e && e.message);
    }

    if (process.env.GA4_FALLBACK_DEBUG === '1') {
      const shortUa = String(req.body?.user_agent || req.headers['user-agent'] || '').slice(0,120);
      console.debug('[GA4-FALLBACK] recv', { path: req.path, page_path: req.body?.page_path, ip: req.ip || req.connection?.remoteAddress, ua: shortUa });
    }

    return handleGa4Fallback(req, res, { redis, inMemoryStats: ga4Stats });
  });

  server.get('/r.gif', (req, res) => {
    try {
      if (redis) redis.hIncrBy('ga4_fallback:stats', `received:${req.path}`, 1).catch(() => {});
      else ga4Stats.received[req.path] = (ga4Stats.received[req.path] || 0) + 1;
    } catch (e) {}

    if (process.env.GA4_FALLBACK_DEBUG === '1') {
      const shortUa = String(req.headers['user-agent'] || '').slice(0,120);
      console.debug('[GA4-FALLBACK] gif recv', { path: req.path, page_path: req.query && req.query.page_path, ip: req.ip || req.connection?.remoteAddress, ua: shortUa });
    }

    return serveGif(req, res);
  });

  // Debug endpoint to inspect counters (only for local debugging; not linked in UI)
  server.get('/_events/stats', async (req, res) => {
    try {
      if (redis) {
        const all = await redis.hGetAll('ga4_fallback:stats');
        return res.json(all);
      }
      return res.json(ga4Stats);
    } catch (e) {
      console.error('[GA4-STATS] read failed', e && e.message);
      return res.status(500).json({ error: 'failed to read stats' });
    }
  });

  /* ---------------- NEXT.JS FALLBACK ---------------- */
  server.all(/.*/, (req, res) => handle(req, res));

  /* ---------------- START SERVER ---------------- */
  const PORT = process.env.PORT || 3000;
  const srv = server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server avviato ✅ http://localhost:${PORT}`);
    console.log(redis ? 'Redis cache attiva' : 'Cache disattivata');
  });

  /* ---------------- GRACEFUL SHUTDOWN ---------------- */
  const shutdown = async (signal) => {
    console.log(`⚠️ Shutdown triggered by signal: ${signal}`);
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
