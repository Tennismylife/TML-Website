import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, context: any) {
  try {
    // support both Next.js versions where params can be a Promise or an object
    const params = await context?.params;
    const id = String(params?.id ?? '');

    // Trova tutte le partite del torneo
    const tournamentMatches = await prisma.match.findMany({
      where: { tourney_id: id },
      select: {
        year: true,
        round: true,
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        loser_id: true,
        loser_name: true,
        loser_ioc: true,
        tourney_date: true,
      },
      orderBy: { tourney_date: 'desc' },
    });

    // Filtra finali
    const finals = tournamentMatches.filter((m) => ["F", "W", "Final"].includes(m.round));

    // Calcolo delle entries totali (anni unici)
    const playerEntries = new Map<string, {
      id: string | number;
      name: string;
      ioc: string;
      years: Set<number>;
      totalEntries: number;
    }>();

    for (const m of tournamentMatches) {
      const year = m.year;
      if (!year) continue;

      // Winner
      if (m.winner_id && m.winner_name) {
        const key = String(m.winner_id);
        const existing = playerEntries.get(key);
        if (!existing) {
          playerEntries.set(key, {
            id: m.winner_id,
            name: m.winner_name,
            ioc: m.winner_ioc ?? "",
            years: new Set([year]),
            totalEntries: 0,
          });
        } else {
          existing.years.add(year);
        }
      }

      // Loser
      if (m.loser_id && m.loser_name) {
        const key = String(m.loser_id);
        const existing = playerEntries.get(key);
        if (!existing) {
          playerEntries.set(key, {
            id: m.loser_id,
            name: m.loser_name,
            ioc: m.loser_ioc ?? "",
            years: new Set([year]),
            totalEntries: 0,
          });
        } else {
          existing.years.add(year);
        }
      }
    }

    // Totale entries
    for (const player of playerEntries.values()) {
      player.totalEntries = player.years.size;
    }

    // Calcolo reaches per round
    const roundReaches = new Map<string, Map<string, {
      id: string | number;
      name: string;
      ioc: string;
      reaches: number;
      totalEntries: number;
      percentage: number;
    }>>();

    for (const m of tournamentMatches) {
      const round = m.round || "Unknown";
      if (["R128", "R64"].includes(round)) continue; // 🔥 Esclusione richiesta

      if (!roundReaches.has(round)) roundReaches.set(round, new Map());
      const players = roundReaches.get(round)!;

      // Winner
      if (m.winner_id && m.winner_name) {
        const key = String(m.winner_id);
        const existing = players.get(key);
        if (!existing) {
          const entry = playerEntries.get(key);
          players.set(key, {
            id: m.winner_id,
            name: m.winner_name,
            ioc: m.winner_ioc ?? "",
            reaches: 1,
            totalEntries: entry?.totalEntries || 0,
            percentage: 0,
          });
        } else {
          existing.reaches++;
        }
      }

      // Loser
      if (m.loser_id && m.loser_name) {
        const key = String(m.loser_id);
        const existing = players.get(key);
        if (!existing) {
          const entry = playerEntries.get(key);
          players.set(key, {
            id: m.loser_id,
            name: m.loser_name,
            ioc: m.loser_ioc ?? "",
            reaches: 1,
            totalEntries: entry?.totalEntries || 0,
            percentage: 0,
          });
        } else {
          existing.reaches++;
        }
      }
    }

    // Percentuali
    for (const players of roundReaches.values()) {
      for (const stats of players.values()) {
        stats.percentage = stats.totalEntries > 0 ? (stats.reaches / stats.totalEntries) * 100 : 0;
      }
    }

    // Calcolo Winner round
    const winnerStats = new Map<string, {
      id: string | number;
      name: string;
      ioc: string;
      reaches: number;
      totalEntries: number;
      percentage: number;
    }>();

    for (const m of finals) {
      if (m.winner_id && m.winner_name) {
        const key = String(m.winner_id);
        const existing = winnerStats.get(key);
        if (!existing) {
          const entry = playerEntries.get(key);
          winnerStats.set(key, {
            id: m.winner_id,
            name: m.winner_name,
            ioc: m.winner_ioc ?? "",
            reaches: 1,
            totalEntries: entry?.totalEntries || 0,
            percentage: 0,
          });
        } else {
          existing.reaches++;
        }
      }
    }

    for (const stats of winnerStats.values()) {
      stats.percentage = stats.totalEntries > 0 ? (stats.reaches / stats.totalEntries) * 100 : 0;
    }

    roundReaches.set("Winner", winnerStats);

    // Ordinamento round (esclusi R128 e R64)
    const roundOrder = ["W", "F", "SF", "QF", "R16", "R32"];
    const sortedRounds = Array.from(roundReaches.keys()).sort((a, b) => {
      const indexA = roundOrder.indexOf(a);
      const indexB = roundOrder.indexOf(b);
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });

    // Composizione finale
    const allRoundItems: any[] = [];

    // Winner per primo
    if (roundReaches.has("Winner")) {
      const winnerPlayers = roundReaches.get("Winner")!;
      const sorted = Array.from(winnerPlayers.values())
        .filter(p => p.totalEntries > 0)
        .sort((a, b) => b.percentage - a.percentage);
      allRoundItems.push({
        title: "Winner",
        list: sorted.slice(0, 10),
        fullList: sorted,
      });
    }

    // Altri round (senza R128 e R64)
    for (const round of sortedRounds.filter(r => !["Winner", "R128", "R64"].includes(r))) {
      const players = roundReaches.get(round)!;
      const sorted = Array.from(players.values())
        .filter(p => p.totalEntries > 0)
        .sort((a, b) => b.percentage - a.percentage);
      allRoundItems.push({
        title: round,
        list: sorted.slice(0, 10),
        fullList: sorted,
      });
    }

    return NextResponse.json({ allRoundItems });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
