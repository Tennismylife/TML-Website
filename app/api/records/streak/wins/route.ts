import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    // Recupera parametri query
    const selectedLevels = url.searchParams.getAll("level");
    const selectedSurfaces = url.searchParams.getAll("surface");
    const selectedBestOf = url.searchParams.getAll("bestOf").map(Number).filter(bo => [1, 3, 5].includes(bo));

    // Recupera la view mvAllConsecutiveWinStreaks
    const mvData = await prisma.mvAllConsecutiveWinStreaks.findFirst();

    // ==============================
    // CASO 1: Nessun filtro → restituisci globale
    // ==============================
    if (!selectedLevels.length && !selectedSurfaces.length && !selectedBestOf.length) {
      if (!mvData) return NextResponse.json({});

      const allPlayerIds = new Set<string>();
      if (mvData.global) (mvData.global as any[]).forEach(s => allPlayerIds.add(s.player_id));
      const players = await prisma.player.findMany({
        where: { id: { in: Array.from(allPlayerIds) } },
        select: { id: true, atpname: true, ioc: true },
      });
      const playerMap = Object.fromEntries(players.map(p => [p.id, p]));

      const formatStreaks = (streaks: any[], category: string) =>
        streaks.map(s => ({
          category,
          player_id: s.player_id,
          player_name: playerMap[s.player_id]?.atpname || `Player ${s.player_id}`,
          player_ioc: playerMap[s.player_id]?.ioc || "",
          total_wins: s.total_wins,
          match_ids: s.match_ids,
        }));

      return NextResponse.json({
        global: formatStreaks((mvData.global as any[]) || [], "global")
      });
    }

    // ==============================
    // CASO 2: 2 o più filtri → calcolo live
    // ==============================
    if ([selectedLevels.length, selectedSurfaces.length, selectedBestOf.length].filter(n => n > 0).length >= 2) {

      // Recupera tutti i match filtrati
      const matches = await prisma.match.findMany({
        where: {
          status: true,
          ...(selectedLevels.length && { tourney_level: { in: selectedLevels } }),
          ...(selectedSurfaces.length && { surface: { in: selectedSurfaces } }),
          ...(selectedBestOf.length && { best_of: { in: selectedBestOf } }),
        },
        orderBy: [
          { tourney_date: "asc" },
          { id: "asc" }
        ],
        select: {
          id: true,
          winner_id: true,
          loser_id: true,
          tourney_date: true,
          surface: true,
          tourney_level: true,
          best_of: true
        },
      });

      // Costruisci player_results
      const playerResults = matches.flatMap(m => [
        { player_id: m.winner_id, id: m.id, tourney_date: m.tourney_date, surface: m.surface, tourney_level: m.tourney_level, best_of: m.best_of, win: 1 },
        { player_id: m.loser_id, id: m.id, tourney_date: m.tourney_date, surface: m.surface, tourney_level: m.tourney_level, best_of: m.best_of, win: 0 }
      ]);

      // Raggruppa per player_id e calcola streaks consecutive
      const streaksByPlayer: Record<string, any[]> = {};
      const playerIds: string[] = Array.from(new Set(playerResults.map(r => String(r.player_id))));
      for (const playerId of playerIds) {
        const results = playerResults
          .filter(r => r.player_id === playerId)
          .sort((a, b) => a.tourney_date.getTime() - b.tourney_date.getTime());

        let currentWins: number[] = [];
        for (const r of results) {
          if (r.win === 1) {
            currentWins.push(r.id);
          } else {
            if (currentWins.length) {
              streaksByPlayer[playerId] = streaksByPlayer[playerId] || [];
              streaksByPlayer[playerId].push({
                player_id: playerId,
                total_wins: currentWins.length,
                match_ids: currentWins,
                surface: r.surface || "Unknown",
                tourney_level: r.tourney_level || "Unknown",
                best_of: r.best_of ?? "Unknown"
              });
              currentWins = [];
            }
          }
        }
        if (currentWins.length) {
          streaksByPlayer[playerId] = streaksByPlayer[playerId] || [];
          streaksByPlayer[playerId].push({
            player_id: playerId,
            total_wins: currentWins.length,
            match_ids: currentWins,
            surface: results[results.length-1].surface || "Unknown",
            tourney_level: results[results.length-1].tourney_level || "Unknown",
            best_of: results[results.length-1].best_of ?? "Unknown"
          });
        }
      }

      // Recupera player_name e player_ioc
      const allPlayerIds = Object.keys(streaksByPlayer);
      const players = await prisma.player.findMany({
        where: { id: { in: allPlayerIds } },
        select: { id: true, atpname: true, ioc: true },
      });
      const playerMap = Object.fromEntries(players.map(p => [p.id, p]));

      for (const playerId of allPlayerIds) {
        streaksByPlayer[playerId] = streaksByPlayer[playerId].map(streak => ({
          ...streak,
          player_name: playerMap[streak.player_id]?.atpname || `Player ${streak.player_id}`,
          player_ioc: playerMap[streak.player_id]?.ioc || "",
        }));
      }

      // Costruisci JSON finale top 100
      const globalStreak = Object.values(streaksByPlayer)
        .flat()
        .sort((a, b) => b.total_wins - a.total_wins)
        .slice(0, 100);

      const surfacesStreak: Record<string, any[]> = {};
      const levelsStreak: Record<string, any[]> = {};
      const bestOfStreak: Record<string, any[]> = {};

      Object.values(streaksByPlayer).flat().forEach(s => {
        const surface = s.surface || "Unknown";
        const level = s.tourney_level || "Unknown";
        const bo = (s.best_of ?? "Unknown").toString();

        surfacesStreak[surface] = surfacesStreak[surface] || [];
        surfacesStreak[surface].push(s);

        levelsStreak[level] = levelsStreak[level] || [];
        levelsStreak[level].push(s);

        bestOfStreak[bo] = bestOfStreak[bo] || [];
        bestOfStreak[bo].push(s);
      });

      Object.keys(surfacesStreak).forEach(k =>
        surfacesStreak[k] = surfacesStreak[k].sort((a, b) => b.total_wins - a.total_wins).slice(0, 100)
      );
      Object.keys(levelsStreak).forEach(k =>
        levelsStreak[k] = levelsStreak[k].sort((a, b) => b.total_wins - a.total_wins).slice(0, 100)
      );
      Object.keys(bestOfStreak).forEach(k =>
        bestOfStreak[k] = bestOfStreak[k].sort((a, b) => b.total_wins - a.total_wins).slice(0, 100)
      );

      return NextResponse.json({
        global: globalStreak,
        surfaces: surfacesStreak,
        levels: levelsStreak,
        best_of: bestOfStreak
      });
    }

    // ==============================
    // CASO 3: filtri singoli → usa mvData
    // ==============================
    if (mvData) {
      const allPlayerIds = new Set<string>();
      if (mvData.global) (mvData.global as any[]).forEach(s => allPlayerIds.add(s.player_id));
      if (mvData.levels) Object.values(mvData.levels).flat().forEach(s => allPlayerIds.add((s as any).player_id));
      if (mvData.surfaces) Object.values(mvData.surfaces).flat().forEach(s => allPlayerIds.add((s as any).player_id));
      if (mvData.best_of) Object.values(mvData.best_of).flat().forEach(s => allPlayerIds.add((s as any).player_id));

      const players = await prisma.player.findMany({
        where: { id: { in: Array.from(allPlayerIds) } },
        select: { id: true, atpname: true, ioc: true },
      });
      const playerMap = Object.fromEntries(players.map(p => [p.id, p]));

      const formatStreaks = (streaks: any[], category: string) =>
        streaks.map(s => ({
          category,
          player_id: s.player_id,
          player_name: playerMap[s.player_id]?.atpname || `Player ${s.player_id}`,
          player_ioc: playerMap[s.player_id]?.ioc || "",
          total_wins: s.total_wins,
          match_ids: s.match_ids,
        }));

      const result: Record<string, any[]> = {};

      if (selectedLevels.length && mvData.levels) {
        for (const level of selectedLevels) {
          if (mvData.levels[level]) result[level] = formatStreaks(mvData.levels[level], level);
        }
      }
      if (selectedSurfaces.length && mvData.surfaces) {
        for (const surface of selectedSurfaces) {
          if (mvData.surfaces[surface]) result[surface] = formatStreaks(mvData.surfaces[surface], surface);
        }
      }
      if (selectedBestOf.length && mvData.best_of) {
        for (const bo of selectedBestOf) {
          const key = bo.toString();
          if (mvData.best_of[key]) result[key] = formatStreaks(mvData.best_of[key], key);
        }
      }

      return NextResponse.json(result);
    }

    return NextResponse.json({});
  } catch (error) {
    console.error("Error in GET /api/records/streak/count:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
