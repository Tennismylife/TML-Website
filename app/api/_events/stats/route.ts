// app/api/_events/stats/route.ts
import { NextResponse } from 'next/server';
import { createClient } from 'redis';

export async function GET(req: Request) {
  // Optional: if you have a Redis instance and want global counters, set REDIS_URL
  const redisUrl = process.env.REDIS_URL || process.env.REDIS || '';
  if (redisUrl) {
    try {
      const client = createClient({ url: redisUrl });
      await client.connect();
      const all = await client.hGetAll('ga4_fallback:stats');
      await client.disconnect();
      return NextResponse.json(all);
    } catch (err) {
      console.warn('[events/stats] redis failed', err && (err as Error).message);
      return NextResponse.json({}, { status: 200 });
    }
  }
  // Default: no central stats available
  return NextResponse.json({});
}
