import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roundParam = searchParams.get("round");
    const selectedSurfaces = searchParams.getAll("surface");
    const selectedLevels = searchParams.getAll("level");
    const limitParam = Math.max(1, Math.min(100, Number(searchParams.get('perPage') ?? searchParams.get('limit') ?? 100)));

    if (!roundParam) {
      return NextResponse.json({ error: "Round parameter is required" }, { status: 400 });
    }

    const where = {
      round: roundParam,
      ...(selectedSurfaces.length && { surface: { in: selectedSurfaces } }),
      ...(selectedLevels.length && { tourney_level: { in: selectedLevels } }),
    };

    // Step 1: aggrega min/max date per giocatore nel DB — 1 riga per giocatore
    // invece di caricare decine di migliaia di righe in memoria (es. R32 su tutti i tornei)
    const grouped = await prisma.playerTournament.groupBy({
      by: ['player_id'],
      where,
      _min: { tourney_date: true },
      _max: { tourney_date: true },
    });

    // Step 2: calcola spanDays, ordina, prendi top N
    const candidates = grouped
      .filter(g => g._min.tourney_date && g._max.tourney_date)
      .map(g => ({
        player_id: g.player_id,
        firstDate: g._min.tourney_date!,
        lastDate: g._max.tourney_date!,
        spanDays: Math.floor(
          (g._max.tourney_date!.getTime() - g._min.tourney_date!.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }))
      .sort((a, b) => b.spanDays - a.spanDays)
      .slice(0, limitParam);

    if (candidates.length === 0) {
      return NextResponse.json({ data: [], round: roundParam });
    }

    const topIds = candidates.map(c => c.player_id);
    const candidateMap = new Map(candidates.map(c => [c.player_id, c]));

    // Step 3: carica dettagli tornei solo per i top N giocatori — dataset piccolo
    const tourneyRows = await prisma.playerTournament.findMany({
      where: { ...where, player_id: { in: topIds } },
      select: { player_id: true, tourney_name: true, tourney_date: true },
    });

    // Step 4: determina primo/ultimo torneo per ciascun giocatore
    const tourneyMap = new Map<string, { first: string; last: string }>();
    for (const t of tourneyRows) {
      const cand = candidateMap.get(t.player_id);
      if (!cand) continue;
      const date = new Date(t.tourney_date);
      if (!tourneyMap.has(t.player_id)) {
        tourneyMap.set(t.player_id, { first: t.tourney_name, last: t.tourney_name });
      } else {
        const entry = tourneyMap.get(t.player_id)!;
        if (date <= cand.firstDate) entry.first = t.tourney_name;
        if (date >= cand.lastDate) entry.last = t.tourney_name;
      }
    }

    // Step 5: info giocatori (nome, ioc, slug)
    const players = await prisma.player.findMany({
      where: { id: { in: topIds } },
      select: { id: true, atpname: true, ioc: true, slug: true },
    });
    const playerMap = new Map(players.map(p => [p.id, p]));

    const data = candidates.map(c => {
      const player = playerMap.get(c.player_id);
      const tourney = tourneyMap.get(c.player_id);
      return {
        id: c.player_id,
        name: player?.atpname || '',
        ioc: player?.ioc || '',
        firstTourney: tourney?.first || '',
        firstDate: c.firstDate.toISOString().split('T')[0],
        lastTourney: tourney?.last || '',
        lastDate: c.lastDate.toISOString().split('T')[0],
        spanDays: c.spanDays,
        slug: player?.slug ?? null,
      };
    });

    return NextResponse.json({ data, round: roundParam });
  } catch (error) {
    console.error("Error fetching player tournament timespan:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
