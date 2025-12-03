// app/api/records/timespan/entries/route.tsx
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const selectedSurfaces = url.searchParams.getAll('surface');
    const selectedLevels = url.searchParams.getAll('level');

    let rawEntries: any[] = [];

    // --- Caso 1: 0 o 1 filtro → usa materialized view
    if (selectedSurfaces.length + selectedLevels.length <= 1) {
      // Prendi i dati dalla MV
      rawEntries = await prisma.mVTimespanEntries.findMany();

      // Recupera info dei giocatori
      const playerIds = rawEntries.map(e => e.player_id);
      const players = await prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, atpname: true, ioc: true },
      });
      const playerMap = Object.fromEntries(players.map(p => [p.id, p]));

      // Filtra i timespan in base al filtro
      rawEntries = rawEntries.map(e => {
        const playerInfo = playerMap[e.player_id] || { atpname: 'Unknown', ioc: null };
        if (selectedSurfaces.length > 0) {
          const filtered = (e.surface_timespan ?? []).filter((ts: any) =>
            selectedSurfaces.includes(ts.surface)
          );
          return { player_id: e.player_id, player_name: playerInfo.atpname, ioc: playerInfo.ioc, surface_timespan: filtered };
        } else if (selectedLevels.length > 0) {
          const filtered = (e.level_timespan ?? []).filter((ts: any) =>
            selectedLevels.includes(ts.level)
          );
          return { player_id: e.player_id, player_name: playerInfo.atpname, ioc: playerInfo.ioc, level_timespan: filtered };
        } else {
          return { player_id: e.player_id, player_name: playerInfo.atpname, ioc: playerInfo.ioc, overall_timespan: [e.overall_timespan] };
        }
      });
    } 
    // --- Caso 2: più filtri → calcolo live compatibile con MV
    else {
      const playerTournaments = await prisma.playerTournament.findMany({
        where: {
          surface: selectedSurfaces.length ? { in: selectedSurfaces } : undefined,
          tourney_level: selectedLevels.length ? { in: selectedLevels } : undefined,
        },
        select: {
          player_id: true,
          tourney_id: true,
          tourney_name: true,
          tourney_date: true,
          surface: true,
          tourney_level: true,
          player: { select: { atpname: true, ioc: true } }
        },
      });

      // Raggruppa per giocatore
      const grouped = new Map<string, typeof playerTournaments>();
      for (const pt of playerTournaments) {
        if (!grouped.has(pt.player_id)) grouped.set(pt.player_id, []);
        grouped.get(pt.player_id)!.push(pt);
      }

      rawEntries = [];

      for (const [playerId, tournaments] of grouped.entries()) {
        // --- Timespan per surface
        const surfaceTimespan = Array.from(
          new Map(
            tournaments
              .filter(t => t.surface != null)
              .map(t => [t.surface, t])
          ).values()
        ).map(surfaceGroup => {
          const group = tournaments.filter(t => t.surface === surfaceGroup.surface);
          const first = group.reduce((a, b) => new Date(a.tourney_date) < new Date(b.tourney_date) ? a : b);
          const last  = group.reduce((a, b) => new Date(a.tourney_date) > new Date(b.tourney_date) ? a : b);
          return {
            surface: first.surface,
            first_tourney_id: first.tourney_id,
            first_tourney_name: first.tourney_name,
            first_tourney_date: first.tourney_date,
            last_tourney_id: last.tourney_id,
            last_tourney_name: last.tourney_name,
            last_tourney_date: last.tourney_date,
            days_between: Math.ceil((new Date(last.tourney_date).getTime() - new Date(first.tourney_date).getTime()) / (1000*60*60*24))
          };
        }).sort((a, b) => b.days_between - a.days_between);

        // --- Timespan per level
        const levelTimespan = Array.from(
          new Map(
            tournaments
              .filter(t => t.tourney_level != null)
              .map(t => [t.tourney_level, t])
          ).values()
        ).map(levelGroup => {
          const group = tournaments.filter(t => t.tourney_level === levelGroup.tourney_level);
          const first = group.reduce((a, b) => new Date(a.tourney_date) < new Date(b.tourney_date) ? a : b);
          const last  = group.reduce((a, b) => new Date(a.tourney_date) > new Date(b.tourney_date) ? a : b);
          return {
            level: first.tourney_level,
            first_tourney_id: first.tourney_id,
            first_tourney_name: first.tourney_name,
            first_tourney_date: first.tourney_date,
            last_tourney_id: last.tourney_id,
            last_tourney_name: last.tourney_name,
            last_tourney_date: last.tourney_date,
            days_between: Math.ceil((new Date(last.tourney_date).getTime() - new Date(first.tourney_date).getTime()) / (1000*60*60*24))
          };
        }).sort((a, b) => b.days_between - a.days_between);

        // --- Timespan overall
        const firstOverall = tournaments.reduce((a, b) => new Date(a.tourney_date) < new Date(b.tourney_date) ? a : b);
        const lastOverall  = tournaments.reduce((a, b) => new Date(a.tourney_date) > new Date(b.tourney_date) ? a : b);
        const overallTimespan = [{
          first_tourney_id: firstOverall.tourney_id,
          first_tourney_name: firstOverall.tourney_name,
          first_tourney_date: firstOverall.tourney_date,
          last_tourney_id: lastOverall.tourney_id,
          last_tourney_name: lastOverall.tourney_name,
          last_tourney_date: lastOverall.tourney_date,
          days_between: Math.ceil((new Date(lastOverall.tourney_date).getTime() - new Date(firstOverall.tourney_date).getTime()) / (1000*60*60*24))
        }];

        rawEntries.push({
          player_id: playerId,
          player_name: tournaments[0].player.atpname,
          ioc: tournaments[0].player.ioc ?? null,
          surface_timespan: surfaceTimespan,
          level_timespan: levelTimespan,
          overall_timespan: overallTimespan
        });
      }
    }

    // --- Ordina per max days_between e prendi top 100
    const top100 = rawEntries
      .map(r => {
        let maxDays = 0;
        if (selectedSurfaces.length > 0 && r.surface_timespan) maxDays = Math.max(...r.surface_timespan.map((s: any) => s.days_between ?? 0));
        else if (selectedLevels.length > 0 && r.level_timespan) maxDays = Math.max(...r.level_timespan.map((l: any) => l.days_between ?? 0));
        else if (r.overall_timespan) maxDays = r.overall_timespan[0].days_between ?? 0;
        return { ...r, max_days_between: maxDays };
      })
      .sort((a, b) => b.max_days_between - a.max_days_between)
      .slice(0, 100);

    // --- Restituisci solo JSON necessario
    const filteredJSON = top100.map(r => {
      if (selectedSurfaces.length > 0) return { player_id: r.player_id, player_name: r.player_name, ioc: r.ioc, surface_timespan: r.surface_timespan };
      if (selectedLevels.length > 0) return { player_id: r.player_id, player_name: r.player_name, ioc: r.ioc, level_timespan: r.level_timespan };
      return { player_id: r.player_id, player_name: r.player_name, ioc: r.ioc, overall_timespan: r.overall_timespan };
    });

    return NextResponse.json(filteredJSON);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
