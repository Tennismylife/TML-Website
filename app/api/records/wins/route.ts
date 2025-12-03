import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

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

    const hasFilters =
      selectedSurfaces.length ||
      selectedLevels.length ||
      selectedRounds.length ||
      selectedBestOf.length;

    let topWinners = [];
    let totalCount = 0;

    if (hasFilters) {
      const filters: any = {
        status: true,
        ...(selectedSurfaces.length ? { surface: { in: selectedSurfaces } } : {}),
        ...(selectedLevels.length ? { tourney_level: { in: selectedLevels } } : {}),
        ...(selectedRounds.length ? { round: { in: selectedRounds } } : {}),
        ...(selectedBestOf.length ? { best_of: { in: selectedBestOf } } : {}),
      };

      const filtered = await prisma.match.groupBy({
        by: ["winner_id", "winner_name", "winner_ioc"],
        where: filters,
        _count: { winner_id: true },   // ✔ CONTEGGIO CORRETTO
        orderBy: { _count: { winner_id: "desc" } },
        take: 100,
      });

      totalCount = filtered.length;

      topWinners = filtered.map((w) => ({
        id: w.winner_id,
        name: w.winner_name,
        ioc: w.winner_ioc,
        wins: w._count.winner_id,     // ✔ CONTEGGIO PRECISO
      }));
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
