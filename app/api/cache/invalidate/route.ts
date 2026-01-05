import { NextResponse, NextRequest } from 'next/server';

const CACHE_KEY_PREFIX = 'tennismylife:';

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
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const secret = body?.secret || null;
    if (process.env.CACHE_SECRET && secret !== process.env.CACHE_SECRET) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const client = await getRedisClient();
    if (!client) return NextResponse.json({ error: 'redis-unavailable' }, { status: 500 });

    const pattern = body?.pattern || null;
    const paths = Array.isArray(body?.paths) ? body.paths : null;
    const all = !!body?.all;

    const toDelete = new Set();

    // helper to iterate keys via SCAN
    async function scanAndCollect(match: string) {
      let cursor = '0';
      do {
        const { cursor: nextCursor, keys } = await client.scan(cursor, { MATCH: match, COUNT: 1000 });
        // node-redis may return cursor as string or Buffer in some environments; coerce to string
        cursor = String(nextCursor);
        for (const k of keys) toDelete.add(k);
      } while (cursor !== '0');
    }

    if (all) {
      await scanAndCollect(`${CACHE_KEY_PREFIX}*`);
    }

    if (pattern) {
      await scanAndCollect(`${CACHE_KEY_PREFIX}*${pattern}*`);
    }

    if (paths) {
      for (const p of paths) {
        await scanAndCollect(`${CACHE_KEY_PREFIX}*${p}*`);
      }
    }

    const keys = Array.from(toDelete);
    if (keys.length === 0) {
      await client.quit();
      return NextResponse.json({ deleted: 0, keys: [] });
    }

    try {
      await client.del.apply(client, keys);
    } catch (e) {
      // continue
    }

    await client.quit();
    return NextResponse.json({ deleted: keys.length, keys });
  } catch (e) {
    console.error('cache invalidate error', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
