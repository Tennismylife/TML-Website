import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") global.prisma = prisma;

/* =========================================================
   Helper: enrichment player info
========================================================= */
async function enrichStreaks(streaks: any[]) {
  const playerIds = Array.from(new Set(streaks.map(s => s.player_id)));

  const players = await prisma.player.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, atpname: true, ioc: true, slug: true }
  });

  const playerMap = Object.fromEntries(players.map(p => [p.id, p]));

  return streaks.map(s => ({
    ...s,
    player_name: playerMap[s.player_id]?.atpname || `Player ${s.player_id}`,
    player_ioc: playerMap[s.player_id]?.ioc || "",
    slug: playerMap[s.player_id]?.slug ?? null,
  }));
}

/* =========================================================
   LIVE streak calculation (NO DUPLICATES)
========================================================= */
function calculateLiveStreaks(matches: any[]) {
  const resultsByPlayer: Record<string, any[]> = {};

  for (const m of matches) {
    if (!resultsByPlayer[m.winner_id]) resultsByPlayer[m.winner_id] = [];
    if (!resultsByPlayer[m.loser_id]) resultsByPlayer[m.loser_id] = [];

    resultsByPlayer[m.winner_id].push({ win: 1, match_id: m.id });
    resultsByPlayer[m.loser_id].push({ win: 0, match_id: m.id });
  }

  const streaks: any[] = [];

  for (const [player_id, results] of Object.entries(resultsByPlayer)) {
    let current: number[] = [];

    for (const r of results) {
      if (r.win === 1) {
        current.push(r.match_id);
      } else {
        if (current.length) {
          streaks.push({
            player_id,
            total_wins: current.length,
            match_ids: [...current]
          });
          current = [];
        }
      }
    }

    if (current.length) {
      streaks.push({
        player_id,
        total_wins: current.length,
        match_ids: [...current]
      });
    }
  }

  return streaks;
}

/* =========================================================
   API
========================================================= */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    const selectedLevels   = url.searchParams.getAll("level");
    const selectedSurfaces = url.searchParams.getAll("surface");
    const selectedRounds   = url.searchParams.getAll("round");
    const selectedBestOf   = [
      ...url.searchParams.getAll("best_of"),
      ...url.searchParams.getAll("bestOf")
    ]
      .map(Number)
      .filter(b => [1, 3, 5].includes(b));

    const rawLimit = Number(url.searchParams.get("limit") ?? "100");
    const limit = Number.isFinite(rawLimit)
      ? Math.min(100, Math.max(1, rawLimit))
      : 100;

    const filtersCount =
      [selectedLevels, selectedSurfaces, selectedRounds, selectedBestOf]
        .filter(a => a.length).length;

    const mvData = await prisma.mvAllConsecutiveWinStreaks.findFirst();

    /* =====================================================
       0 FILTRI → MV GLOBALE
    ===================================================== */
    if (filtersCount === 0 && mvData?.global) {
      const global = await enrichStreaks(mvData.global as any[]);
      return NextResponse.json({
        global: global.slice(0, limit)
      });
    }

    /* =====================================================
       1 FILTRO → MV SE POSSIBILE, ALTRIMENTI LIVE
    ===================================================== */
    if (filtersCount === 1 && mvData) {
      const result: Record<string, any[]> = {};
      let usedMV = false;

      if (selectedLevels.length && mvData.levels) {
        for (const l of selectedLevels) {
          if ((mvData.levels as any)[l]?.length) {
            const enriched = await enrichStreaks((mvData.levels as any)[l]);
            result[l] = enriched.slice(0, limit);
            usedMV = true;
          }
        }
      }

      if (selectedSurfaces.length && mvData.surfaces) {
        for (const s of selectedSurfaces) {
          if ((mvData.surfaces as any)[s]?.length) {
            const enriched = await enrichStreaks((mvData.surfaces as any)[s]);
            result[s] = enriched.slice(0, limit);
            usedMV = true;
          }
        }
      }

      if (selectedRounds.length && mvData.rounds) {
        for (const r of selectedRounds) {
          if ((mvData.rounds as any)[r]?.length) {
            const enriched = await enrichStreaks((mvData.rounds as any)[r]);
            result[r] = enriched.slice(0, limit);
            usedMV = true;
          }
        }
      }

      if (selectedBestOf.length && mvData.best_of) {
        for (const bo of selectedBestOf) {
          const key = bo.toString();
          if ((mvData.best_of as any)[key]?.length) {
            const enriched = await enrichStreaks((mvData.best_of as any)[key]);
            result[key] = enriched.slice(0, limit);
            usedMV = true;
          }
        }
      }

      if (usedMV) {
        return NextResponse.json(result);
      }
      // ❗ fallback LIVE
    }

    /* =====================================================
       2+ FILTRI → LIVE
    ===================================================== */
    const matches = await prisma.match.findMany({
      where: {
        status: true,
        ...(selectedLevels.length && { tourney_level: { in: selectedLevels } }),
        ...(selectedSurfaces.length && { surface: { in: selectedSurfaces } }),
        ...(selectedRounds.length && { round: { in: selectedRounds } }),
        ...(selectedBestOf.length && { best_of: { in: selectedBestOf } })
      },
      orderBy: [{ tourney_date: "asc" }, { id: "asc" }],
      select: { id: true, winner_id: true, loser_id: true }
    });

    const liveStreaks = calculateLiveStreaks(matches)
      .sort((a, b) => b.total_wins - a.total_wins)
      .slice(0, limit);

    return NextResponse.json({
      global: (await enrichStreaks(liveStreaks)).slice(0, limit)
    });

  } catch (error: any) {
    console.error("GET /api/records/streak/count", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

