import { NextRequest, NextResponse } from 'next/server';
import { shouldIndexPlayerSeason } from '@/app/players/[id]/playerIndexing';

export async function GET(request: NextRequest, context: any) {
  const params = await context?.params;
  const playerId = params?.id ? String(params.id) : '';
  const yearParam = request.nextUrl.searchParams.get('year');
  const year = Number(yearParam);

  if (!playerId || !yearParam || !Number.isInteger(year)) {
    return NextResponse.json({ error: 'Invalid player ID or year' }, { status: 400 });
  }

  try {
    const index = await shouldIndexPlayerSeason(playerId, year);
    return NextResponse.json({ index });
  } catch (err) {
    console.error('season-robots error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
