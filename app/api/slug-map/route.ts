import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// Optional Redis cache key
const REDIS_KEY = 'slug_map_v1';

async function getRedisClient() {
  const url = process.env.REDIS_URL || process.env.REDIS || process.env.REDIS_HOST;
  if (!url) return null;
  try {
    const { createClient } = await import('redis');
    const client = createClient({ url });
    client.on('error', () => {});
    await client.connect();
    return client;
  } catch (e) {
    // ignore redis errors
    return null;
  }
}

export async function GET(request: NextRequest) {
  // Try Redis first
  let client: any = null;
  try {
    client = await getRedisClient();
    if (client) {
      const cached = await client.get(REDIS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return NextResponse.json(parsed, {
          headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=60' },
        });
      }
    }

    // Query DB for players and tournaments
    const [players, tournaments] = await Promise.all([
      prisma.player.findMany({ select: { id: true, slug: true } }),
      prisma.tournament.findMany({ select: { id: true, slug: true } }),
    ]);

    const playersMap: Record<string, string> = {};
    for (const p of players) {
      if (!p.slug) continue;
      playersMap[String(p.id)] = p.slug;
      playersMap[String(p.slug).toUpperCase()] = p.slug;
    }

    const tournamentsMap: Record<string, string> = {};
    for (const t of tournaments) {
      if (!t.slug) continue;
      tournamentsMap[String(t.id)] = t.slug;
      tournamentsMap[String(t.slug).toUpperCase()] = t.slug;
    }

    const payload = { players: playersMap, tournaments: tournamentsMap };

    // Cache in Redis (no TTL; rely on invalidation) when available
    if (client) {
      try {
        await client.set(REDIS_KEY, JSON.stringify(payload));
      } catch (e) {
        // ignore
      } finally {
        try { await client.quit(); } catch {}
      }
    }

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=60' },
    });
  } catch (err) {
    if (client) try { await client.quit(); } catch {}
    console.error('slug-map API error', err);
    return NextResponse.json({ players: {}, tournaments: {} }, { status: 500 });
  }
}