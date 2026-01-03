import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, context: any) {
  const params = await context?.params;
  const playerId = params?.id ? String(params.id) : '';

  if (!playerId) return NextResponse.json({ error: 'Invalid player ID' }, { status: 400 });

  try {
    let player: any = null;
    if (/^\d+$/.test(playerId)) {
      player = await prisma.player.findUnique({ where: { id: String(playerId) }, select: { id: true, slug: true, player: true, atpname: true } });
    } else {
      player = await prisma.player.findUnique({ where: { slug: playerId }, select: { id: true, slug: true, player: true, atpname: true } });
    }

    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

    return NextResponse.json({ id: player.id, slug: player.slug || null, name: player.atpname || player.player || null });
  } catch (err) {
    console.error('players header error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
