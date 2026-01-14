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
    const selectedRounds   = url.searchParams.getAll('round').filter(Boolean);
    const selectedBestOf = url.searchParams
      .getAll('best_of')
      .map(b => Number(b))
      .filter(n => Number.isInteger(n));

    const filtersCount = [
      selectedSurfaces.length > 0,
      selectedLevels.length > 0,
      selectedRounds.length > 0,
      selectedBestOf.length > 0,
    ].filter(Boolean).length;

    let playersData: Array<{ id: string, name: string, ioc: string, wins_at_age: number }> = [];

    // =====================================================
    // CASE 1 → 0 o 1 filtro → usa la materialized view
    // =====================================================
    if (filtersCount <= 1) {
      const data = await prisma.mvWinsAges.findMany({
        select: {
          winner_id: true,
          ages_json: true,
          ages_by_surface_json: true,
          ages_by_level_json: true,
          ages_by_round_json: true,
          ages_by_best_of_json: true,
        },
      });

      const players = await prisma.player.findMany({
        where: { id: { in: data.map(d => d.winner_id) } },
        select: { id: true, player: true, ioc: true },
      });

      playersData = players.map(p => {
        const d = data.find(x => x.winner_id === p.id);
        if (!d) return null;

        // selezione età in base al filtro
        let selectedAges: Record<string, number> = (d.ages_json as Record<string, number>) ?? {};
        if (selectedSurfaces.length === 1) selectedAges = (d.ages_by_surface_json as any)?.[selectedSurfaces[0]] ?? {};
        else if (selectedLevels.length === 1) selectedAges = (d.ages_by_level_json as any)?.[selectedLevels[0]] ?? {};
        else if (selectedRounds.length === 1) selectedAges = (d.ages_by_round_json as any)?.[selectedRounds[0]] ?? {};
        else if (selectedBestOf.length === 1) selectedAges = (d.ages_by_best_of_json as any)?.[String(selectedBestOf[0])] ?? {};

        // conta quante vittorie hanno età <= targetAge
        const winsAtAge = Object.values(selectedAges).filter(age => age <= targetAge).length;
        if (winsAtAge === 0) return null;

        return {
          id: p.id,
          name: p.player,
          ioc: p.ioc || '',
          wins_at_age: winsAtAge,
        };
      }).filter(Boolean) as typeof playersData;
    }

    // =====================================================
    // CASE 2 → 2 o più filtri → fetch dinamico dai match
    // =====================================================
    else {
      const where: any = {
        ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
        ...(selectedRounds.length > 0 && { round: { in: selectedRounds } }),
        ...(selectedBestOf.length > 0 && { best_of: { in: selectedBestOf } }),
        status: true,
      };

      const allMatches = await prisma.match.findMany({
        where,
        select: { winner_id: true, winner_age: true },
      });

      const countsByWinner = new Map<string, number[]>();
      for (const match of allMatches) {
        if (!match.winner_id || match.winner_age == null) continue;
        const winnerId = String(match.winner_id);
        const age = Number(match.winner_age);
        let arr = countsByWinner.get(winnerId);
        if (!arr) {
          arr = [];
          countsByWinner.set(winnerId, arr);
        }
        arr.push(age);
      }

      if (countsByWinner.size > 0) {
        const uniqueIds = Array.from(countsByWinner.keys());
        const playersInfo = await prisma.player.findMany({
          where: { id: { in: uniqueIds } },
          select: { id: true, player: true, ioc: true },
        });

        for (const p of playersInfo) {
          const ages = countsByWinner.get(p.id);
          if (!ages) continue;

          // numero di vittorie con age <= targetAge
          const winsAtAge = ages.filter(a => a <= targetAge).length;
          if (winsAtAge === 0) continue;

          playersData.push({
            id: p.id,
            name: p.player,
            ioc: p.ioc || '',
            wins_at_age: winsAtAge,
          });
        }
      }
    }

    // =====================================================
    // ORDINAMENTO DECRESCENTE PER NUMERO DI VITTORIE
    // =====================================================
    playersData.sort((a, b) => b.wins_at_age - a.wins_at_age);

    const limitParam = Number(url.searchParams.get('limit') ?? '100');
    const limit = Number.isFinite(limitParam) ? Math.min(1000, Math.max(1, Math.floor(limitParam))) : 100;

    return NextResponse.json(playersData.slice(0, limit));

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
