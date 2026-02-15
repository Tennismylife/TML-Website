import redis from '@/lib/redis';

const DEFAULT_TTL_SECONDS = 12 * 60 * 60; // 12 hours
const KEY_PREFIX = 'records:api:';

function normalizeEndpoint(endpoint: string) {
  // Accept either a full URL or a relative path like `/api/records/wins?perPage=10`
  // Normalise query params ordering so equivalent queries share the same key.
  try {
    const url = new URL(endpoint, 'http://dummy');
    const pathname = url.pathname;
    const params = Array.from(url.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b));
    const qs = params.map(([k, v]) => `${k}=${v}`).join('&');
    return `${KEY_PREFIX}${pathname}${qs ? `?${qs}` : ''}`;
  } catch (err) {
    // fallback: use raw string
    return `${KEY_PREFIX}${endpoint}`;
  }
}

/**
 * Get cached JSON for a records API endpoint, or compute and store it on miss.
 *
 * - endpoint: relative endpoint ("/api/records/wins?perPage=10")
 * - fetcher: async function returning the JSON-serializable payload (called on cache miss)
 * - ttlSeconds: optional TTL (defaults to 12 hours)
 *
 * Logs `CACHE HIT <key>` and `CACHE MISS <key>` to console.
 */
export async function getOrSetRecordsCache<T = any>(
  endpoint: string,
  fetcher: () => Promise<T>,
  ttlSeconds = DEFAULT_TTL_SECONDS
): Promise<T> {
  const key = normalizeEndpoint(endpoint);

  // If redis client not available, just compute and return (no-op cache)
  if (!redis) {
    if (process.env.VERBOSE_LOGS === '1') console.warn('[CACHE DISABLED] redis client not available');
    return fetcher();
  }

  try {
    const cached = await redis.get(key);
    if (cached) {
      console.log('CACHE HIT', key);
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    console.warn('[CACHE READ ERROR]', err?.message || err);
    // fallthrough -> compute
  }

  // cache miss: compute and store
  const val = await fetcher();

  try {
    await redis.set(key, JSON.stringify(val), { EX: Math.max(1, Math.floor(ttlSeconds)) });
    console.log('CACHE MISS', key);
  } catch (err) {
    console.warn('[CACHE STORE ERROR]', err?.message || err);
  }

  return val;
}

/**
 * Invalidate a single cached endpoint. Accepts either a relative endpoint or an already-normalized cache key.
 */
export async function invalidateRecordsCache(endpointOrKey: string) {
  const key = endpointOrKey.startsWith(KEY_PREFIX) ? endpointOrKey : normalizeEndpoint(endpointOrKey);
  if (!redis) return;
  try {
    await redis.del(key);
    if (process.env.VERBOSE_LOGS === '1') console.log('[CACHE INVALIDATED]', key);
  } catch (err) {
    console.warn('[CACHE INVALIDATE ERROR]', err?.message || err);
  }
}

/**
 * Invalidate all records API cache entries (uses KEYS; acceptable for moderate keyspace).
 */
export async function invalidateAllRecordsCache() {
  if (!redis) return;
  try {
    const keys = await redis.keys(`${KEY_PREFIX}*`);
    if (keys.length) await redis.del(keys);
    if (process.env.VERBOSE_LOGS === '1') console.log('[CACHE INVALIDATED ALL] records:api:* ->', keys.length);
  } catch (err) {
    console.warn('[CACHE INVALIDATE ALL ERROR]', err?.message || err);
  }
}

export default {
  getOrSetRecordsCache,
  invalidateRecordsCache,
  invalidateAllRecordsCache,
};
