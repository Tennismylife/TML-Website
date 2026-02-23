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

    // ----------- after flag -----------
    const afterParam = String(url.searchParams.get('after') ?? '').toLowerCase();
    const after = (afterParam === '1' || afterParam === 'true' || afterParam === 'yes');

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

    let playersData: Array<{ 
      id: string, 
      name: string, 
      ioc: string, 
      played_at_age: number 
    }> = [];

    // =====================================================
    // CASE 1 → 0 o 1 filtro → usa la materialized view
    // =====================================================
    if (filtersCount <= 1) {
      const data = await prisma.mVPlayedAges.findMany({
        select: {
          player_id: true,
          ages_json: true,
          ages_by_surface_json: true,
          ages_by_level_json: true,
          ages_by_round_json: true,
          ages_by_best_of_json: true,
        },
      });

      const players = await prisma.player.findMany({
        where: { id: { in: data.map(d => d.player_id) } },
        select: { id: true, player: true, ioc: true },
      });

      playersData = players.map(p => {
        const d = data.find(x => x.player_id === p.id);
        if (!d) return null;

        // selezione età corretta
        let selectedAges: Record<string, number> = (d.ages_json as any) ?? {};

        if (selectedSurfaces.length === 1)
          selectedAges = (d.ages_by_surface_json as any)?.[selectedSurfaces[0]] ?? {};

        else if (selectedLevels.length === 1)
          selectedAges = (d.ages_by_level_json as any)?.[selectedLevels[0]] ?? {};

        else if (selectedRounds.length === 1)
          selectedAges = (d.ages_by_round_json as any)?.[selectedRounds[0]] ?? {};

        else if (selectedBestOf.length === 1)
          selectedAges = (d.ages_by_best_of_json as any)?.[String(selectedBestOf[0])] ?? {};

        // count matches with age in the requested range
        // selectedAges maps age-string -> count, so filter by key and sum counts
        const playedAtAge = Object.entries(selectedAges)
          .map(([ageStr, count]) => ({ age: Number(ageStr), count: Number(count) }))
          .filter(({ age }) => after ? age >= targetAge : age <= targetAge)
          .reduce((sum, { count }) => sum + count, 0);
        if (playedAtAge === 0) return null;

        return {
          id: p.id,
          name: p.player,
          ioc: p.ioc || '',
          played_at_age: playedAtAge,
        };
      }).filter(Boolean) as typeof playersData;
    }

    // =====================================================
    // CASE 2 → 2+ filtri → fetch dinamico (winner + loser)
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
        select: { winner_id: true, loser_id: true, winner_age: true, loser_age: true },
      });

      const ageMap = new Map<string, number[]>();

      for (const m of allMatches) {
        if (m.winner_id && m.winner_age != null) {
          const id = String(m.winner_id);
          const arr = ageMap.get(id) ?? [];
          arr.push(Number(m.winner_age));
          ageMap.set(id, arr);
        }
        if (m.loser_id && m.loser_age != null) {
          const id = String(m.loser_id);
          const arr = ageMap.get(id) ?? [];
          arr.push(Number(m.loser_age));
          ageMap.set(id, arr);
        }
      }

      if (ageMap.size > 0) {
        const uniqueIds = Array.from(ageMap.keys());

        const playersInfo = await prisma.player.findMany({
          where: { id: { in: uniqueIds } },
          select: { id: true, player: true, ioc: true },
        });

        for (const p of playersInfo) {
          const ages = ageMap.get(p.id);
          if (!ages) continue;

          const playedAtAge = ages.filter(a => after ? (a >= targetAge) : (a <= targetAge)).length;
          if (playedAtAge === 0) continue;

          playersData.push({
            id: p.id,
            name: p.player,
            ioc: p.ioc || '',
            played_at_age: playedAtAge,
          });
        }
      }
    }

    // =====================================================
    // ORDINA PER PARTITE GIOCATE (DESC)
    // =====================================================
    playersData.sort((a, b) => b.played_at_age - a.played_at_age);

    const limitParam = Number(url.searchParams.get('limit') ?? '100');
    const limit = Number.isFinite(limitParam) ? Math.min(100, Math.max(1, Math.floor(limitParam))) : 100;

    // Attach slugs when available
    const ids = playersData.map(p => String(p.id));
    if (ids.length > 0) {
      const rows = await prisma.player.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } });
      const slugMap = new Map(rows.map(r => [r.id, r.slug] as [string, string | null]));
      playersData = playersData.map(p => ({ ...p, slug: slugMap.get(String(p.id)) ?? null }));
    }

    return NextResponse.json(playersData.slice(0, limit));

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
