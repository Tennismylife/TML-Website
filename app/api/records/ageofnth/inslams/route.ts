import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// --- Prisma client reuse ---
const globalForPrisma = global as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient({ log: ['error', 'warn'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const nParam = url.searchParams.get('n');
    if (!nParam) return NextResponse.json([], { status: 400 });
    const n = parseInt(nParam, 10);
    if (isNaN(n) || n < 1) return NextResponse.json([], { status: 400 });

    const limitParam = Number(url.searchParams.get('limit'));
    const limit = Number.isInteger(limitParam) ? Math.min(Math.max(limitParam, 1), 1000) : 100;

    const selectedSurfaces = url.searchParams.getAll('surface');
    const round = url.searchParams.get('round') || '';

    // --- Fetch all Slam wins filtered ---
    const where: any = { status: true, round: round || undefined };
    if (selectedSurfaces.length > 0) where.surface = { in: selectedSurfaces };
    where.tourney_name = { in: ['Australian Open', 'Roland Garros', 'Wimbledon', 'US Open'] };

    const matches = await prisma.match.findMany({
      where,
      orderBy: { winner_age: 'asc' },
      select: {
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        winner_age: true,
        tourney_name: true,
      },
    });

    // --- Aggregate victories per player ---
    const playerWinsMap = new Map<string, { name: string; ioc: string; ages: number[]; perSlam: Record<string, number> }>();

    for (const m of matches) {
      if (!m.winner_id || m.winner_age == null) continue;
      const id = String(m.winner_id);
      if (!playerWinsMap.has(id)) {
        playerWinsMap.set(id, {
          name: m.winner_name ?? '',
          ioc: m.winner_ioc ?? '',
          ages: [],
          perSlam: {
            'Australian Open': 0,
            'Roland Garros': 0,
            Wimbledon: 0,
            'US Open': 0,
          },
        });
      }
      const player = playerWinsMap.get(id)!;
      player.ages.push(m.winner_age);
      if (m.tourney_name) player.perSlam[m.tourney_name] += 1;
    }

    // --- Construct output: take N-th win ---
    const output = Array.from(playerWinsMap.entries())
      .map(([id, p]) => {
        if (p.ages.length < n) return null; // skip if player has less than N wins
        // calculate per Slam distribution for first N wins
        const perSlamN: Record<string, number> = {
          'Australian Open': 0,
          'Roland Garros': 0,
          Wimbledon: 0,
          'US Open': 0,
        };
        let count = 0;
        for (const m of matches) {
          if (String(m.winner_id) !== id) continue;
          if (m.tourney_name) perSlamN[m.tourney_name] += 1;
          count += 1;
          if (count === n) break;
        }
        return {
          id,
          name: p.name,
          ioc: p.ioc,
          age_nth_win: p.ages[n - 1].toFixed(3), // puoi formattare come XXy YYd nel frontend
          perSlam: perSlamN,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.age_nth_win.localeCompare(b!.age_nth_win)) // ascending
      .slice(0, limit);

    // Attach slugs when available
    const ids = output.map(o => String(o.id)).filter(Boolean);
    if (ids.length > 0) {
      const rows = await prisma.player.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } });
      const slugMap = Object.fromEntries(rows.map(r => [r.id, r.slug]));
      const enriched = output.map(o => ({ ...o, slug: slugMap[String(o.id)] ?? null }));
      return NextResponse.json(enriched);
    }

    return NextResponse.json(output);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
