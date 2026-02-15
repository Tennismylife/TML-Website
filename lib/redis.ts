import { createClient } from 'redis';

// Lightweight Redis client wrapper shared across the app.
// Usage: import redis from '@/lib/redis';

declare global {
  // allow global caching of the redis client during HMR / serverless re-use
  // eslint-disable-next-line no-var
  var __redisClient: ReturnType<typeof createClient> | undefined;
}

const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const client = global.__redisClient ?? createClient({ url });

if (!global.__redisClient) {
  client.on('error', (err) => console.warn('Redis error:', err));
  // connect asynchronously and don't block module evaluation — callers should handle errors gracefully
  client.connect().catch((err) => console.warn('Redis connect failed:', err?.message || err));
  global.__redisClient = client;
}

export default client;
