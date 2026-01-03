import { NextResponse } from 'next/server';
import { clearRedisCache } from '@/scripts/refresh-mvs-listener';

export async function POST(request: Request) {
  // Protect with secret for safety
  const secret = process.env.CLEAR_CACHE_SECRET;
  const hdr = (request.headers.get('x-secret') || request.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!secret || hdr !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await clearRedisCache();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
