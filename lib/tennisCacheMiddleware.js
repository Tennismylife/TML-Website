// Reusable cache middlewares for server.js
// Exports: createCacheMiddlewares({ redis, buildCacheKey, decompressIfGzip, shouldBypassCache, cacheTTL })

function coerceToStr(v) {
  return v == null ? '' : String(v);
}

function createCacheMiddlewares({ redis, buildCacheKey, decompressIfGzip, shouldBypassCache, cacheTTL = 0 }) {
  async function readMiddleware(req, res, next) {
    const isRevalidate = req.headers['x-revalidate'] === '1';

    if (!redis || shouldBypassCache(req)) return next();

    const type = req.path.startsWith('/api') ? 'api' : 'page';
    const key = buildCacheKey(req, type);

    try {
      const cachedStr = await redis.get(key);
      if (!cachedStr) {
        console.log('[CACHE MISS]', req.originalUrl || req.url || req.path, key);
        return next();
      }

      if (isRevalidate) {
        console.log('[CACHE REVALIDATE]', req.originalUrl || req.url || req.path, key);
        return next();
      }

      const cached = JSON.parse(cachedStr);
      const body = Buffer.from(cached.body, 'base64');

      res.setHeader('Content-Type', cached.type);
      res.setHeader('Cache-Control', 'private, max-age=0');
      res.setHeader('X-Cache', `${type.toUpperCase()}-HIT`);
      res.setHeader('X-SSR-COMPLETE', '1');

      res.fromCache = true;
      console.log('[CACHE HIT]', req.originalUrl || req.url || req.path, key, body.length);

      return res.send(body);
    } catch (e) {
      console.error('[CACHE READ ERROR]', e);
      return next();
    }
  }

  async function writeMiddleware(req, res, next) {
    if (!redis || req.method !== 'GET' || req.query.nocache || res.fromCache) return next();

    const type = req.path.startsWith('/api') ? 'api' : 'page';

    /* Skip homepage by default */
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
              console.warn('[CACHE SKIP] HTML incompleto', req.originalUrl || req.url || req.path, key);
              return originalEnd(chunk, ...args);
            }
          }

          const payload = JSON.stringify({ body: bodyBuffer.toString('base64'), type: ct });

          if (cacheTTL > 0) {
            redis.setEx(key, cacheTTL, payload)
              .then(() => console.log('[CACHE STORED]', req.originalUrl || req.url || req.path, key, bodyBuffer.length))
              .catch(err => console.error('[CACHE WRITE ERROR]', err));
          } else {
            redis.set(key, payload)
              .then(() => console.log('[CACHE STORED]', req.originalUrl || req.url || req.path, key, bodyBuffer.length))
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
  }

  return { readMiddleware, writeMiddleware };
}

module.exports = { createCacheMiddlewares };
