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
      const slugLower = String(playerId).toLowerCase();
      player = await prisma.player.findUnique({ where: { slug: slugLower }, select: { id: true, slug: true, player: true, atpname: true } });
    }

    if (!player) {
      // If slug-based lookup failed and id looks like a legacy code, consult external slug-map as a best-effort fallback
      try {
        const apiUrl = 'https://stats.tennismylife.org/api/slug-map';
        const apiResp = await fetch(apiUrl, { method: 'GET', cache: 'force-cache' });
        if (apiResp.ok) {
          const maps = await apiResp.json();
          const mapped = maps?.players?.[String(playerId).toUpperCase()];
          if (mapped) {
            const p2 = await prisma.player.findUnique({ where: { slug: mapped }, select: { id: true, slug: true, player: true, atpname: true } });
            if (p2) return NextResponse.json({ id: p2.id, slug: p2.slug || null, name: p2.atpname || p2.player || null });
          }
        }
      } catch (e) {
        // swallow errors from external service
      }

      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    return NextResponse.json({ id: player.id, slug: player.slug || null, name: player.atpname || player.player || null });
  } catch (err) {
    console.error('players header error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
