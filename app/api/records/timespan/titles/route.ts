import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedSurfaces = (searchParams.getAll("surface") ?? [])
      .flatMap(v => v.split(",").map(s => s.trim()).filter(Boolean));
    const selectedLevels = (searchParams.getAll("level") ?? [])
      .flatMap(v => v.split(",").map(s => s.trim()).filter(Boolean));
    const topN = Math.max(1, Math.min(1000, Number(searchParams.get("limit") ?? 100)));

    // Fetch only winners of final rounds
    const matches = await prisma.match.findMany({
      where: {
        round: 'F',
        team_event: false,
        ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
      },
      select: {
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        tourney_date: true,
        tourney_name: true,
      },
    });

    // Aggregate min/max dates per winner
    const winners = new Map<string, { name: string; ioc: string; minDate: Date; maxDate: Date; minTourney: string; maxTourney: string }>();

    for (const m of matches) {
      if (!m.winner_id) continue;
      const date = m.tourney_date ? new Date(m.tourney_date) : new Date(0);
      const key = String(m.winner_id);
      const existing = winners.get(key);
      if (!existing) {
        winners.set(key, {
          name: m.winner_name ?? "",
          ioc: m.winner_ioc ?? "",
          minDate: date,
          maxDate: date,
          minTourney: m.tourney_name ?? "",
          maxTourney: m.tourney_name ?? "",
        });
      } else {
        if (date < existing.minDate) {
          existing.minDate = date;
          existing.minTourney = m.tourney_name ?? "";
        }
        if (date > existing.maxDate) {
          existing.maxDate = date;
          existing.maxTourney = m.tourney_name ?? "";
        }
      }
    }

    const results = Array.from(winners.entries()).map(([id, w]) => ({
      id,
      name: w.name,
      ioc: w.ioc,
      firstTourney: w.minTourney,
      firstDate: w.minDate.toISOString().split("T")[0],
      lastTourney: w.maxTourney,
      lastDate: w.maxDate.toISOString().split("T")[0],
      spanDays: Math.floor((w.maxDate.getTime() - w.minDate.getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a, b) => b.spanDays - a.spanDays)
    .slice(0, topN);

    // Attach slugs when available
    const ids = results.map(r => String(r.id));
    if (ids.length > 0) {
      const rows = await prisma.player.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } });
      const slugMap = new Map(rows.map(r => [r.id, r.slug] as [string, string | null]));
      const enriched = results.map(r => ({ ...r, slug: slugMap.get(String(r.id)) ?? null }));
      return NextResponse.json({ data: enriched });
    }

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("Error fetching winners timespan:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
