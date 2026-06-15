import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = 'force-dynamic';

const prisma = globalThis.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedSurfaces = url.searchParams.getAll("surface");
    const selectedLevels = url.searchParams.getAll("level");
    const selectedRounds = url.searchParams.getAll("round");
    const selectedBestOf = url.searchParams
      .getAll("bestOf")
      .map(Number)
      .filter((n) => !isNaN(n));
    const maxLoserRankParam = url.searchParams.get("top");
    const maxLoserRank = maxLoserRankParam ? Number(maxLoserRankParam) : null;

    const hasFilters =
      selectedSurfaces.length ||
      selectedLevels.length ||
      selectedRounds.length ||
      selectedBestOf.length ||
      maxLoserRank !== null;

    // If any filters are active, compute the wins ranking live from Match.
    // If no filters are active, use the pre-aggregated materialized view mVTopWinners.
    const isGrandSlamOnly =
      selectedLevels.length === 1 &&
      selectedLevels[0] === "G" &&
      selectedSurfaces.length === 0 &&
      selectedRounds.length === 0 &&
      selectedBestOf.length === 0 &&
      maxLoserRank === null;

    const isMasters1000Only =
      selectedLevels.length === 1 &&
      selectedLevels[0] === "M" &&
      selectedSurfaces.length === 0 &&
      selectedRounds.length === 0 &&
      selectedBestOf.length === 0 &&
      maxLoserRank === null;

    const isHardCourtOnly =
      selectedSurfaces.length === 1 &&
      selectedSurfaces[0] === "Hard" &&
      selectedLevels.length === 0 &&
      selectedRounds.length === 0 &&
      selectedBestOf.length === 0 &&
      maxLoserRank === null;

    let grandSlamContext: {
      latestTourneyName: string;
      latestTourneyYear: number | null;
      wins: number;
    } | null = null;

    let masters1000Context: {
      wins: number;
      losses: number;
      latestTourneyName: string;
      latestTourneyYear: number | null;
    } | null = null;

    let careerContext: {
      wins: number;
      losses: number;
    } | null = null;

    let hardCourtContext: {
      wins: number;
    } | null = null;

    let topWinners: Array<{ id: any; name: string; ioc?: string | null; wins: number; slug?: string | null }> = [];
    let totalCount = 0;

    if (hasFilters) {
      // Build base WHERE conditions
      const conditions: string[] = ['m.status = true'];
      const params: any[] = [];

      if (selectedSurfaces.length) {
        params.push(selectedSurfaces);
        conditions.push(`m.surface = ANY($${params.length})`);
      }
      if (selectedLevels.length) {
        params.push(selectedLevels);
        conditions.push(`m.tourney_level = ANY($${params.length})`);
      }
      if (selectedRounds.length) {
        params.push(selectedRounds);
        conditions.push(`m.round = ANY($${params.length})`);
      }
      if (selectedBestOf.length) {
        params.push(selectedBestOf);
        conditions.push(`m.best_of = ANY($${params.length})`);
      }
      if (maxLoserRank !== null) {
        // loser_rank is stored as float8 in the DB; cast the literal to avoid
        // operator type mismatch when Prisma sends $N as int4
        params.push(maxLoserRank);
        conditions.push(`m.loser_rank <= $${params.length}::float8`);
      }

      const whereClause = conditions.join(' AND ');
      const sql = `
        SELECT m.winner_id, m.winner_name, m.winner_ioc, COUNT(*) AS wins
        FROM "Match" m
        WHERE ${whereClause}
        GROUP BY m.winner_id, m.winner_name, m.winner_ioc
        ORDER BY wins DESC
        LIMIT 100
      `;

      const rows: any[] = await prisma.$queryRawUnsafe(sql, ...params);

      topWinners = rows.map((w) => ({
        id: w.winner_id,
        name: w.winner_name,
        ioc: w.winner_ioc,
        wins: Number(w.wins),
      }));
      totalCount = topWinners.length;

      // Fetch slugs for returned players to provide canonical URLs
      try {
        const ids = [...new Set([...topWinners.map(t => t.id)])].filter(Boolean);
        if (ids.length) {
          const players = await prisma.player.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } });
          const slugMap: Record<string | number, string | null> = {};
          players.forEach(p => { slugMap[p.id] = p.slug ?? null; });
          topWinners = topWinners.map(t => ({ ...t, slug: slugMap[t.id] ?? null }));
        }
      } catch (e) {
        // non-critical: if slug lookup fails, continue without slugs
        console.warn('Failed to fetch player slugs for wins', e);
      }

      if (isGrandSlamOnly) {
        try {
          const latestDjokovicSlam = await prisma.match.findFirst({
            where: {
              status: true,
              tourney_level: "G",
              OR: [
                { winner_name: "Novak Djokovic" },
                { loser_name: "Novak Djokovic" },
              ],
            },
            orderBy: [{ tourney_date: "desc" }, { id: "desc" }],
            select: {
              tourney_name: true,
              tourney_date: true,
            },
          });

          const grandSlamWins = await prisma.match.count({
            where: {
              status: true,
              tourney_level: "G",
              winner_name: "Novak Djokovic",
              NOT: { score: "W/O" },
            },
          });

          const rawName = (latestDjokovicSlam?.tourney_name ?? "").trim();
          const normalizedName =
            rawName === "Australian Open-1" || rawName === "Australian Open-2"
              ? "Australian Open"
              : rawName;

          grandSlamContext = {
            latestTourneyName: normalizedName || "Australian Open",
            latestTourneyYear: latestDjokovicSlam?.tourney_date
              ? new Date(latestDjokovicSlam.tourney_date).getUTCFullYear()
              : null,
            wins: grandSlamWins,
          };
        } catch (e) {
          // Non-critical metadata: keep response working even if this lookup fails.
          console.warn("Failed to fetch latest Djokovic slam context", e);
        }
      }

      if (isHardCourtOnly) {
        try {
          const wins = await prisma.match.count({
            where: { status: true, surface: 'Hard', winner_name: 'Novak Djokovic', NOT: { score: 'W/O' } },
          });
          hardCourtContext = { wins };
        } catch (e) {
          console.warn('Failed to fetch Djokovic hard-court context', e);
        }
      }

      if (isMasters1000Only) {
        try {
          const djokovicMastersWins = topWinners.find((p) => p.name === "Novak Djokovic")?.wins ?? 0;
          const djokovicMastersLosses = await prisma.match.count({
            where: {
              status: true,
              tourney_level: "M",
              loser_name: "Novak Djokovic",
            },
          });

          const latestDjokovicMasters = await prisma.match.findFirst({
            where: {
              status: true,
              tourney_level: "M",
              OR: [
                { winner_name: "Novak Djokovic" },
                { loser_name: "Novak Djokovic" },
              ],
            },
            orderBy: [{ tourney_date: "desc" }, { id: "desc" }],
            select: {
              tourney_name: true,
              tourney_date: true,
            },
          });

          masters1000Context = {
            wins: djokovicMastersWins,
            losses: djokovicMastersLosses,
            latestTourneyName: (latestDjokovicMasters?.tourney_name ?? "").trim() || "Mutua Madrid Open",
            latestTourneyYear: latestDjokovicMasters?.tourney_date
              ? new Date(latestDjokovicMasters.tourney_date).getUTCFullYear()
              : null,
          };
        } catch (e) {
          // Non-critical metadata: keep response working even if this lookup fails.
          console.warn("Failed to fetch latest Djokovic masters context", e);
        }
      }
    } else {
      // No filters active: use materialized view mVTopWinners for the global wins ranking.
      const winners = await prisma.mVTopWinners.findMany({
        orderBy: { total_wins: "desc" },
        take: 100,
      });

      totalCount = winners.length;

      topWinners = winners.map((w) => ({
        id: w.winner_id,
        name: w.winner_name,
        ioc: w.winner_ioc,
        wins: w.total_wins,
      }));

      // Fetch slugs for returned players to provide canonical URLs
      try {
        const ids = [...new Set([...topWinners.map(t => t.id)])].filter(Boolean);
        if (ids.length) {
          const players = await prisma.player.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } });
          const slugMap: Record<string | number, string | null> = {};
          players.forEach(p => { slugMap[p.id] = p.slug ?? null; });
          topWinners = topWinners.map(t => ({ ...t, slug: slugMap[t.id] ?? null }));
        }
      } catch (e) {
        // non-critical: if slug lookup fails, continue without slugs
        console.warn('Failed to fetch player slugs for wins', e);
      }

      // Fetch Djokovic's career wins and losses (excluding W/O) for the narrative
      try {
        const [wins, losses] = await Promise.all([
          prisma.match.count({
            where: { status: true, winner_name: 'Novak Djokovic', NOT: { score: 'W/O' } },
          }),
          prisma.match.count({
            where: { status: true, loser_name: 'Novak Djokovic', NOT: { score: 'W/O' } },
          }),
        ]);
        careerContext = { wins, losses };
      } catch (e) {
        console.warn('Failed to fetch Djokovic career context', e);
      }
    }

    return NextResponse.json({ topWinners, totalCount, grandSlamContext, masters1000Context, careerContext, hardCourtContext });
  } catch (error) {
    console.error("Error in GET /records/wins:", error);
    return NextResponse.json(
      { topWinners: [], totalCount: 0 },
      { status: 500 }
    );
  }
}
