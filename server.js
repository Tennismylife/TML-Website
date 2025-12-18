// server.js — Redis v4 + Next.js SSR/SSG + API JSON (decompressed + no loop)
const express = require('express');
const { createClient } = require('redis');
const next = require('next');
const zlib = require('zlib');

const dev = false;
const nextApp = next({ dev, dir: '.', conf: { distDir: '.next' } });
const handle = nextApp.getRequestHandler();

const API_TTL_SECONDS = 600;
const PAGE_TTL_SECONDS = 300;
const CONTROL_PARAMS = new Set(['nocache', 'x-refresh']);

let redis = null;
async function initRedis() {
  try {
    redis = createClient({ url: 'redis://127.0.0.1:6379' });
    redis.on('error', (err) => console.warn('Redis error:', err));
    await redis.connect();
    console.log('Redis connesso ? Cache attiva');
  } catch {
    redis = null;
    console.warn('Redis NON disponibile ? Cache disattivata');
  }
}

function shouldBypassCache(req) {
  return req.method !== 'GET' || req.query.nocache || req.headers['x-refresh'] === '1';
}

function buildCacheKey(req, type = 'page') {
  const url = new URL(`${req.protocol}://${req.headers.host}${req.originalUrl}`);
  const params = new URLSearchParams(url.search);
  const normalized = new URLSearchParams();
  for (const k of [...params.keys()].filter(k => !CONTROL_PARAMS.has(k))) {
    normalized.append(k, params.get(k));
  }
  const queryString = normalized.toString();
  return `tennismylife:${type}:${req.path}${queryString ? `?${queryString}` : ''}`;
}

// decompressione gzip se necessario
function decompressIfGzip(buffer, headers) {
  if (buffer && headers['content-encoding'] === 'gzip') {
    try {
      return zlib.gunzipSync(buffer);
    } catch (e) {
      console.warn('Decompressione gzip fallita, salvo buffer originale');
      return buffer;
    }
  }
  return buffer;
}

(async () => {
  await nextApp.prepare();
  await initRedis();

  const server = express();
  server.use(express.json());

  // Header X-Cache sempre visibile
  server.use((req, res, next) => {
    res.setHeader('X-Cache', 'UNCACHED');
    next();
  });

  // ---------- 1) READ Cache ----------
  server.use(async (req, res, next) => {
    if (!redis) return next();
    if (shouldBypassCache(req)) return next();

    const type = req.path.startsWith('/api') ? 'api' : 'page';
    const key = buildCacheKey(req, type);

    try {
      const cachedStr = await redis.get(key);
      if (!cachedStr) return next();

      const cachedBuffer = Buffer.from(cachedStr, 'utf-8'); // già decompresso
      res.set('Content-Type', type === 'api' ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8');
      res.set('X-Cache', type.toUpperCase() + '-HIT');
      res.set('Cache-Control', 'private, max-age=0');

      // ? Evita che il middleware WRITE scriva di nuovo
      res.fromCache = true;

      console.log('[CACHE READ]', key, 'HIT | Dimensione:', cachedBuffer.length);
      return res.send(cachedBuffer);
    } catch (e) {
      console.error('[CACHE READ ERROR]', e);
      return next();
    }
  });

  // ---------- 2) WRITE Cache ----------
  server.use((req, res, next) => {
    if (!redis) return next();
    if (shouldBypassCache(req)) return next();

    // ? Se la risposta proviene già dalla cache, non riscrivere
    if (res.fromCache) return next();

    const type = req.path.startsWith('/api') ? 'api' : 'page';
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
          let bodyBuffer = Buffer.concat(chunks);
          bodyBuffer = decompressIfGzip(bodyBuffer, res.getHeaders()); // decompresso

          redis.setEx(
            key,
            type === 'api' ? API_TTL_SECONDS : PAGE_TTL_SECONDS,
            bodyBuffer
          ).then(() => console.log('[CACHE WRITE]', key, 'Dimensione:', bodyBuffer.length))
           .catch(err => console.error('[CACHE WRITE ERROR]', key, err));

          if (res.getHeader('X-Cache') === 'UNCACHED') {
            res.setHeader('X-Cache', type.toUpperCase() + '-STORED');
          }
          if (!res.getHeader('Cache-Control')) res.setHeader('Cache-Control', 'private, max-age=0');
        }
      } catch (e) {
        console.error('[CACHE PROCESS ERROR]', e);
      }

      return originalEnd(chunk, ...args);
    };

    next();
  });

  // ---------- 3) Next.js fallback ----------
  server.all(/.*/, (req, res) => handle(req, res));

  // ---------- 4) Avvio ----------
  const PORT = process.env.PORT || 3000;
  const srv = server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server avviato su http://localhost:${PORT}`);
    console.log(redis ? 'Cache Redis attiva' : 'Cache disattivata');
  });

  // ---------- 5) Graceful shutdown ----------
  const shutdown = async () => {
    console.log('Chiusura server...');
    srv.close(() => console.log('Server chiuso.'));
    if (redis) {
      try { await redis.quit(); console.log('Redis chiuso.'); } catch {}
    }
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();
