// server.js — Next.js + Redis v4
// Sicurezza massima: homepage NON cachata, asset statici esclusi

const express = require('express');
const { createClient } = require('redis');
const next = require('next');
const zlib = require('zlib');

/* ---------------- Global error logging ---------------- */
process.on('uncaughtException', (err) => {
  console.error('⚠️ UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

const dev = false;
const nextApp = next({ dev, dir: '.', conf: { distDir: '.next' } });
const handle = nextApp.getRequestHandler();

const CONTROL_PARAMS = new Set(['nocache', 'x-refresh']);

let redis = null;

/* ---------------- Redis init ---------------- */
async function initRedis() {
  try {
    redis = createClient({ url: 'redis://127.0.0.1:6379' });
    redis.on('error', err => console.warn('Redis error:', err));
    await redis.connect();
    console.log('Redis connesso ✅ Cache attiva');
  } catch {
    redis = null;
    console.warn('Redis NON disponibile ⚠️ Cache disattivata');
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

  /* ---------------- Track active requests ---------------- */
  let activeRequests = 0;
  server.use((req, res, next) => {
    activeRequests++;
    console.log(`🟢 Active requests: ${activeRequests} | ${req.method} ${req.path}`);

    res.on('finish', () => {
      activeRequests--;
      console.log(`🔵 Request finished. Active requests: ${activeRequests}`);
    });

    next();
  });

  /* Header sempre presente */
  server.use((req, res, next) => {
    res.setHeader('X-Cache', 'UNCACHED');
    next();
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
      console.error('[CACHE READ ERROR]', e, 'Key:', key);
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
          ).then(() => console.log('[CACHE STORED]', key, bodyBuffer.length))
           .catch(err => console.error('[CACHE WRITE ERROR]', err, 'Key:', key));

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
  const srv = server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server avviato ✅ http://localhost:${PORT}`);
    console.log(redis ? 'Redis cache attiva' : 'Cache disattivata');
  });

  /* ---------------- GRACEFUL SHUTDOWN ---------------- */
  const shutdown = async () => {
    console.warn('⚠️ Shutdown triggered...');
    console.log('Active requests at shutdown:', activeRequests);
    srv.close(() => console.log('Server chiuso'));
    if (redis) {
      try { await redis.quit(); console.log('Redis disconnesso'); } catch {}
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();
