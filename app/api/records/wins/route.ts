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
        const ids = topWinners.map(t => t.id).filter(Boolean);
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
    } else {
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
        const ids = topWinners.map(t => t.id).filter(Boolean);
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
    }

    return NextResponse.json({ topWinners, totalCount });
  } catch (error) {
    console.error("Error in GET /records/wins:", error);
    return NextResponse.json(
      { topWinners: [], totalCount: 0 },
      { status: 500 }
    );
  }
}
