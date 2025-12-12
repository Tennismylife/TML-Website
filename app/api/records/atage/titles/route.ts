import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    // ----------- age parameter -----------
    const ageParam = url.searchParams.get('age');
    if (!ageParam) return NextResponse.json({ error: 'Age parameter required' }, { status: 400 });
    const targetAge = Number(ageParam);
    if (isNaN(targetAge)) return NextResponse.json({ error: 'Invalid age parameter' }, { status: 400 });

    // ----------- filters -----------
    const selectedSurfaces = url.searchParams.getAll('surface').filter(Boolean);
    const selectedLevels   = url.searchParams.getAll('level').filter(Boolean);

    const where: any = {
      round: 'F', // solo finali
      team_event: false,
      ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
      ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
    };

    // Recupera tutti i match finali filtrati
    const allMatches = await prisma.match.findMany({
      where,
      select: { winner_id: true, winner_age: true },
    });

    // Mappa winner_id → array delle età delle vittorie
    const winnersMap = new Map<string, number[]>();
    for (const m of allMatches) {
      if (!m.winner_id || m.winner_age == null) continue;
      const winnerId = String(m.winner_id);
      const age = Number(m.winner_age);
      if (!winnersMap.has(winnerId)) winnersMap.set(winnerId, []);
      winnersMap.get(winnerId)?.push(age);
    }

    const uniqueIds = Array.from(winnersMap.keys());
    const playersInfo = await prisma.player.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, player: true, ioc: true },
    });

    const result = playersInfo.map(p => {
      const ages = winnersMap.get(p.id) || [];
      const validAges = ages.filter(a => a <= targetAge);
      if (validAges.length === 0) return null;

      // età più vicina ≤ targetAge
      const closestAge = Math.max(...validAges);

      return {
        id: p.id,
        name: p.player,
        ioc: p.ioc || '',
        titles_at_age: validAges.filter(a => a <= closestAge).length,
      };
    }).filter(Boolean);

    // Ordina decrescente per numero di titoli
    result.sort((a, b) => b.titles_at_age - a.titles_at_age);

    return NextResponse.json(result);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
