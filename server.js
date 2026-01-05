// server.js � Next.js + Redis v4
// Sicurezza massima: homepage NON cachata, asset statici esclusi

const express = require('express');
const { createClient } = require('redis');
const next = require('next');
const zlib = require('zlib');

const dev = false;
const nextApp = next({ dev, dir: '.', conf: { distDir: '.next' } });
const handle = nextApp.getRequestHandler();


const CONTROL_PARAMS = new Set(['nocache', 'x-refresh']);

// Cache preload/refresh configuration (env-driven)
const CACHE_TTL_SECONDS = process.env.CACHE_TTL_SECONDS ? Number(process.env.CACHE_TTL_SECONDS) : 0; // 0 => no TTL (manual invalidation)
const CACHE_PRELOAD = process.env.CACHE_PRELOAD === '1';
const CACHE_PRELOAD_HOURS = process.env.CACHE_PRELOAD_HOURS ? Number(process.env.CACHE_PRELOAD_HOURS) : 12;
const PRELOAD_ALL_TOURNAMENTS = process.env.PRELOAD_ALL_TOURNAMENTS === '1';
const PRELOAD_PATHS = process.env.PRELOAD_PATHS ? process.env.PRELOAD_PATHS.split(',').map(s => s.trim()).filter(Boolean) : ['/tournaments/australian-open/records/ages/main'];
const CACHE_SECRET = process.env.CACHE_SECRET || null; // used by invalidation endpoints

let redis = null;

/* ---------------- Redis init ---------------- */
async function initRedis() {
  try {
    redis = createClient({ url: 'redis://127.0.0.1:6379' });
    redis.on('error', err => console.warn('Redis error:', err));
    await redis.connect();
    console.log('Redis connesso ? Cache attiva');
  } catch {
    redis = null;
    console.warn('Redis NON disponibile ? Cache disattivata');
  }
}

/* ---------------- Utils ---------------- */
function shouldBypassCache(req) {
  return (
    req.method !== 'GET' ||
    req.query.nocache ||
    req.headers['x-refresh'] === '1'
  );
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
    try {
      return zlib.gunzipSync(buffer);
    } catch {
      return buffer;
    }
  }
  return buffer;
}

/* ---------------- Bootstrap ---------------- */
(async () => {
  await nextApp.prepare();
  await initRedis();

  const server = express();
  server.use(express.json());

  /* Header sempre presente */
  server.use((req, res, next) => {
    res.setHeader('X-Cache', 'UNCACHED');
    next();
  });

  /* ---------------- CACHE READ ---------------- */
  server.use(async (req, res, next) => {
    // support internal revalidation header: if present, skip returning cache so we force regeneration
    const isRevalidate = req.headers['x-revalidate'] === '1';

    if (!redis || shouldBypassCache(req)) return next();

    const type = req.path.startsWith('/api') ? 'api' : 'page';
    const key = buildCacheKey(req, type);

    try {
      const cachedStr = await redis.get(key);
      if (!cachedStr) {
        console.log('[CACHE MISS]', key);
        return next();
      }

      if (isRevalidate) {
        // treat as miss but keep stored copy — cause generation and later overwrite
        console.log('[CACHE REVALIDATE]', key);
        return next();
      }

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
    // Skip write for non-GET, explicit nocache query, when response served from cache, or when redis unavailable
    if (!redis || req.method !== 'GET' || req.query.nocache || res.fromCache) return next();

    const type = req.path.startsWith('/api') ? 'api' : 'page';

    /* Opzione A: homepage "/" NON cachata by default. Set env CACHE_HOME=1 to allow caching homepage. */
    if (type === 'page' && req.path === '/' && process.env.CACHE_HOME !== '1') return next();

    /* Escludi asset statici */
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

          /* NO streaming / Flight / RSC */
          if (
            headers['transfer-encoding'] === 'chunked' ||
            ct.includes('text/x-component') ||
            ct.includes('application/octet-stream')
          ) {
            return originalEnd(chunk, ...args);
          }

          let bodyBuffer = Buffer.concat(chunks);
          bodyBuffer = decompressIfGzip(bodyBuffer, headers);

          /* HTML incompleto ? skip */
          if (ct.includes('text/html')) {
            const html = bodyBuffer.toString('utf-8');
            if (!html.includes('__NEXT_DATA__')) {
              console.warn('[CACHE SKIP] HTML incompleto', key);
              return originalEnd(chunk, ...args);
            }
          }

          /* SALVA in Redis */
          const payload = JSON.stringify({ body: bodyBuffer.toString('base64'), type: ct });

          if (CACHE_TTL_SECONDS > 0) {
            redis.setEx(key, CACHE_TTL_SECONDS, payload)
              .then(() => console.log('[CACHE STORED]', key, bodyBuffer.length))
              .catch(err => console.error('[CACHE WRITE ERROR]', err));
          } else {
            redis.set(key, payload)
              .then(() => console.log('[CACHE STORED]', key, bodyBuffer.length))
              .catch(err => console.error('[CACHE WRITE ERROR]', err));
          }

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

  /* ---------------- NEXT.JS FALLBACK ---------------- */
  server.all(/.*/, (req, res) => handle(req, res));

  /* ---------------- START SERVER ---------------- */
  const PORT = process.env.PORT || 3000;
  const srv = server.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server avviato ? http://localhost:${PORT}`);
    console.log(redis ? 'Redis cache attiva' : 'Cache disattivata');

    // perform initial preload & warm if configured
    if (redis && CACHE_PRELOAD) {
      try {
        const origin = `http://localhost:${PORT}`;

        // preload slug map into redis and optionally warm pages
        await preloadSlugMap(origin);

        // Build list of paths to warm
        let warmPaths = [...PRELOAD_PATHS];

        if (PRELOAD_ALL_TOURNAMENTS) {
          // attempt to get tournaments map and generate paths
          try {
            const sm = await redis.get('slug_map_v1');
            if (sm) {
              const parsed = JSON.parse(sm);
              const tournaments = Object.values(parsed.tournaments || {});
              for (const t of tournaments) {
                warmPaths.push(`/tournaments/${t}/records/ages/main`);
              }
            }
          } catch (e) {
            console.warn('Failed to load tournaments map from redis for preload', e);
          }
        }

        await warmPathsConcurrently(origin, warmPaths);

        // schedule periodic refresh
        setInterval(async () => {
          console.log('Periodic cache refresh: preload slug-map and warm configured pages');
          try {
            await preloadSlugMap(origin);
            await warmPathsConcurrently(origin, warmPaths);
          } catch (e) {
            console.error('Periodic refresh error', e);
          }
        }, Math.max(1, CACHE_PRELOAD_HOURS) * 60 * 60 * 1000);

      } catch (e) {
        console.error('Preload error', e);
      }
    }
  });

  /* ---------------- GRACEFUL SHUTDOWN ---------------- */

  async function preloadSlugMap(origin) {
    try {
      console.log('Preloading slug-map into redis');
      const res = await (await import('node-fetch')).default(`${origin}/api/slug-map`);
      if (!res.ok) {
        console.warn('slug-map preload failed', res.status);
        return;
      }
      const payload = await res.json();
      try {
        await redis.set('slug_map_v1', JSON.stringify(payload));
        console.log('slug-map stored in redis');
      } catch (e) {
        console.warn('Failed to store slug-map in redis', e);
      }
    } catch (e) {
      console.warn('Error preloading slug-map', e);
    }
  }

  async function warmPathsConcurrently(origin, paths, concurrency = 8) {
    console.log('Warming paths:', paths.length);
    const queue = paths.slice();
    const results = [];

    async function worker() {
      while (queue.length) {
        const p = queue.shift();
        try {
          const url = `${origin}${p}`;
          const res = await (await import('node-fetch')).default(url, { headers: { 'x-revalidate': '1' } });
          results.push({ path: p, status: res.status });
          console.log('[WARM]', p, res.status);
        } catch (e) {
          console.error('[WARM ERROR]', p, e);
        }
      }
    }

    const workers = new Array(Math.min(concurrency, paths.length)).fill(0).map(() => worker());
    await Promise.all(workers);
    return results;
  }
  const shutdown = async () => {
    console.log('Shutdown...');
    srv.close(() => console.log('Server chiuso'));
    if (redis) {
      try { await redis.quit(); } catch {}
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();
