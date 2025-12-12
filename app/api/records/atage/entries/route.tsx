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

    const filtersCount = [selectedSurfaces.length > 0, selectedLevels.length > 0].filter(Boolean).length;

    let playersData: Array<{ id: string, name: string, ioc: string, participations_at_age: number }> = [];

    // =====================================================
    // CASE 1 → 0 o 1 filtro → usa la materialized view
    // =====================================================
    if (filtersCount <= 1) {
      const data = await prisma.mVEntriesAges.findMany({
        select: {
          player_id: true,
          ages_json: true,
          ages_by_surface_json: true,
          ages_by_level_json: true,
        },
      });

      const players = await prisma.player.findMany({
        where: { id: { in: data.map(d => d.player_id) } },
        select: { id: true, player: true, ioc: true },
      });

      playersData = players.map(p => {
        const d = data.find(x => x.player_id === p.id);
        if (!d) return null;

        // selezione età in base al filtro
        let selectedAges: Record<string, number> = (d.ages_json as Record<string, number>) ?? {};
        if (selectedSurfaces.length === 1) selectedAges = (d.ages_by_surface_json as any)?.[selectedSurfaces[0]] ?? {};
        else if (selectedLevels.length === 1) selectedAges = (d.ages_by_level_json as any)?.[selectedLevels[0]] ?? {};

        // trova l'età più vicina <= targetAge
        const ageKeys = Object.keys(selectedAges)
          .map(k => parseFloat(k))
          .filter(a => a <= targetAge);
        if (ageKeys.length === 0) return null;

        const closestAge = Math.max(...ageKeys);
        const participations = selectedAges[closestAge.toFixed(3)];

        return {
          id: p.id,
          name: p.player,
          ioc: p.ioc || '',
          participations_at_age: participations,
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
      };

      // recupera tutte le partite filtrate
      const allMatches = await prisma.match.findMany({
        where,
        select: { winner_id: true, winner_age: true, loser_id: true, loser_age: true, event_id: true },
      });

      const participationsMap = new Map<string, number[]>();
      const firstMatchPerPlayerEvent = new Map<string, Set<string>>();

      for (const m of allMatches) {
        // Winner
        if (m.winner_id && m.winner_age != null) {
          const key = String(m.winner_id);
          if (!firstMatchPerPlayerEvent.has(key)) firstMatchPerPlayerEvent.set(key, new Set());
          if (!firstMatchPerPlayerEvent.get(key)?.has(String(m.event_id))) {
            firstMatchPerPlayerEvent.get(key)?.add(String(m.event_id));
            if (!participationsMap.has(key)) participationsMap.set(key, []);
            participationsMap.get(key)?.push(Number(m.winner_age));
          }
        }
        // Loser
        if (m.loser_id && m.loser_age != null) {
          const key = String(m.loser_id);
          if (!firstMatchPerPlayerEvent.has(key)) firstMatchPerPlayerEvent.set(key, new Set());
          if (!firstMatchPerPlayerEvent.get(key)?.has(String(m.event_id))) {
            firstMatchPerPlayerEvent.get(key)?.add(String(m.event_id));
            if (!participationsMap.has(key)) participationsMap.set(key, []);
            participationsMap.get(key)?.push(Number(m.loser_age));
          }
        }
      }

      if (participationsMap.size > 0) {
        const uniqueIds = Array.from(participationsMap.keys());
        const playersInfo = await prisma.player.findMany({
          where: { id: { in: uniqueIds } },
          select: { id: true, player: true, ioc: true },
        });

        for (const p of playersInfo) {
          const ages = participationsMap.get(p.id);
          if (!ages) continue;

          const validAges = ages.filter(a => a <= targetAge);
          if (validAges.length === 0) continue;

          const closestAge = Math.max(...validAges);

          playersData.push({
            id: p.id,
            name: p.player,
            ioc: p.ioc || '',
            participations_at_age: validAges.filter(a => a <= closestAge).length,
          });
        }
      }
    }

    // =====================================================
    // ORDINA DECRESCENTE PER NUMERO DI PARTECIPAZIONI
    // =====================================================
    playersData.sort((a, b) => b.participations_at_age - a.participations_at_age);
    const topPlayers = playersData.slice(0, 100);

    return NextResponse.json(topPlayers);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
