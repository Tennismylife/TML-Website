import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

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

    console.time('Total API');

    // =====================================================
    // CASE 1 → 0 o 1 filtro → usa la materialized view
    // =====================================================
    if (filtersCount <= 1) {
      console.time('Use materialized view mv_wins_ages');

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

      const result = players.map(p => {
        const d = data.find(x => x.winner_id === p.id);
        if (!d) return null;

        let selectedAges: Record<string, number> = (d.ages_json as Record<string, number>) ?? {};

        if (selectedSurfaces.length === 1) {
          const key = selectedSurfaces[0];
          selectedAges = (d.ages_by_surface_json as any)?.[key] ?? {};
        } else if (selectedLevels.length === 1) {
          const key = selectedLevels[0];
          selectedAges = (d.ages_by_level_json as any)?.[key] ?? {};
        } else if (selectedRounds.length === 1) {
          const key = selectedRounds[0];
          selectedAges = (d.ages_by_round_json as any)?.[key] ?? {};
        } else if (selectedBestOf.length === 1) {
          const key = String(selectedBestOf[0]);
          selectedAges = (d.ages_by_best_of_json as any)?.[key] ?? {};
        }

        return {
          id: p.id,
          name: p.player,
          ioc: p.ioc || '',
          ages: { ages_json: selectedAges },
        };
      }).filter(Boolean);

      console.timeEnd('Use materialized view mv_wins_ages');
      console.timeEnd('Total API');

      return NextResponse.json(result);
    }

    // =====================================================
    // CASE 2 → 2 o più filtri → algoritmo completo (no limiti)
    // =====================================================
    console.time('Use dynamic filtered algorithm');

    const where: any = {
      ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
      ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
      ...(selectedRounds.length > 0 && { round: { in: selectedRounds } }),
      ...(selectedBestOf.length > 0 && { best_of: { in: selectedBestOf } }),
    };

    console.time('Fetch all filtered matches');
    const allMatches = await prisma.match.findMany({
      where,
      select: { winner_id: true, winner_age: true },
    });
    console.timeEnd('Fetch all filtered matches');

    if (allMatches.length === 0) {
      console.warn('⚠️ Nessun match trovato con questi filtri.');
      return NextResponse.json([]);
    }

    console.time('Fetch players info');
    const uniqueIds = [...new Set(allMatches.map(m => m.winner_id).filter(Boolean))];
    const playersInfo = await prisma.player.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, player: true, ioc: true },
    });
    console.timeEnd('Fetch players info');

    console.time('Build cumulative ages JSON');
    // Step 1: conta vittorie per età
    const countsByWinner = new Map<number, Map<string, number>>();
    for (const row of allMatches) {
      if (!row.winner_id || row.winner_age == null) continue;
      const ageNum = typeof row.winner_age === 'number' ? row.winner_age : Number(row.winner_age);
      if (!Number.isFinite(ageNum)) continue;
      const roundedKey = (Math.round(ageNum * 1000) / 1000).toFixed(3);
      const winnerIdNum = Number(row.winner_id);
      let map = countsByWinner.get(winnerIdNum);
      if (!map) {
        map = new Map<string, number>();
        countsByWinner.set(winnerIdNum, map);
      }
      map.set(roundedKey, (map.get(roundedKey) || 0) + 1);
    }

    // Step 2: rendi progressivo (cumulativo)
    const cumulativeByWinner = new Map<number, Record<string, number>>();
    for (const [winnerId, ageMap] of countsByWinner.entries()) {
      const sorted = Array.from(ageMap.entries())
        .map(([age, cnt]) => [parseFloat(age), cnt] as [number, number])
        .sort((a, b) => a[0] - b[0]);

      const cumulativeObj: Record<string, number> = {};
      let cumulative = 0;
      for (const [age, cnt] of sorted) {
        cumulative += cnt;
        cumulativeObj[age.toFixed(3)] = cumulative;
      }
      cumulativeByWinner.set(winnerId, cumulativeObj);
    }

    // Step 3: costruisci risultato coerente
    const result = playersInfo.map(p => ({
      id: p.id,
      name: p.player,
      ioc: p.ioc || '',
      ages: { ages_json: cumulativeByWinner.get(Number(p.id)) || {} },
    }));
    console.timeEnd('Build cumulative ages JSON');
    console.timeEnd('Use dynamic filtered algorithm');
    console.timeEnd('Total API');

    return NextResponse.json(result);

  } catch (error) {
    console.error('API Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
