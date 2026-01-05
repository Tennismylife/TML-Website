import { NextRequest, NextResponse } from 'next/server';

async function doFetch(origin: string, path: string) {
  try {
    const res = await fetch(`${origin}${path}`, { headers: { 'x-revalidate': '1' } });
    return { path, status: res.status };
  } catch (e) {
    return { path, status: 0, error: String(e) };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const secret = body?.secret || null;
    if (process.env.CACHE_SECRET && secret !== process.env.CACHE_SECRET) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const paths = Array.isArray(body?.paths) ? body.paths : [];
    if (paths.length === 0) return NextResponse.json({ error: 'no-paths' }, { status: 400 });

    const origin = body?.origin || `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    const results = [];
    for (const p of paths) {
      // ensure leading slash
      const path = p.startsWith('/') ? p : `/${p}`;
      results.push(await doFetch(origin, path));
    }

    return NextResponse.json({ results });
  } catch (e) {
    console.error('cache refresh error', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
