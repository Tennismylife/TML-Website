import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function toDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

function formatDaysAsYears(days: number) {
  const years = Math.floor(days / 365);
  const remainingDays = days % 365;
  return `${years}y ${remainingDays}d`;
}

function updatePlayerMap(
  players: Map<string, any>,
  id: string | number,
  name: string,
  ioc: string,
  date: Date
) {
  const key = String(id);
  const existing = players.get(key);
  if (!existing) {
    players.set(key, { id, name, ioc, firstDate: date, lastDate: date, days: "0y 0d" });
  } else {
    if (date < existing.firstDate) existing.firstDate = date;
    if (date > existing.lastDate) existing.lastDate = date;
  }
}

export async function GET(request: NextRequest, context: any) {
  try {
    const params = await context?.params;
    const id = String(params?.id ?? '');
    
    const { searchParams } = new URL(request.url);
    const full = searchParams.get("full") === "true";  // fullList se true
    const filterRound = searchParams.get("round") || null;

    // Fetch all matches for the tournament
    const matches = await prisma.match.findMany({
      where: { tourney_id: id },
      select: {
        tourney_id: true,
        tourney_name: true,
        tourney_date: true,
        round: true,
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        loser_id: true,
        loser_name: true,
        loser_ioc: true,
      },
      orderBy: { tourney_date: "desc" },
    });

    // Finals (per calcolare i "Winner")
    const finals = matches.filter((m) =>
      ["F", "Final", "W"].includes(m.round)
    );

    // Round → giocatori → date min/max
    const roundSpans = new Map<string, Map<string, any>>();
    for (const m of matches) {
      const round = m.round || "Unknown";
      const date = toDate(m.tourney_date);
      if (!date) continue;
      if (!roundSpans.has(round)) roundSpans.set(round, new Map());
      const players = roundSpans.get(round)!;

      if (m.winner_id && m.winner_name) {
        updatePlayerMap(players, m.winner_id, m.winner_name, m.winner_ioc ?? "", date);
      }
      if (m.loser_id && m.loser_name) {
        updatePlayerMap(players, m.loser_id, m.loser_name, m.loser_ioc ?? "", date);
      }
    }

    // Calcolo days come “Xy Yd”
    for (const players of roundSpans.values()) {
      for (const player of players.values()) {
        const totalDays = Math.floor(
          (player.lastDate.getTime() - player.firstDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        player.days = formatDaysAsYears(totalDays);
      }
    }

    // Winner spans
    const winnerSpans = new Map<string, any>();
    for (const m of finals) {
      const date = toDate(m.tourney_date);
      if (!date || !m.winner_id || !m.winner_name) continue;
      updatePlayerMap(winnerSpans, m.winner_id, m.winner_name, m.winner_ioc ?? "", date);
    }
    for (const player of winnerSpans.values()) {
      const totalDays = Math.floor(
        (player.lastDate.getTime() - player.firstDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      player.days = formatDaysAsYears(totalDays);
    }

    // Ordine logico dei round
    const roundOrder = ["W", "F", "SF", "QF", "R16", "R32", "R64", "R128"];
    const sortedRounds = Array.from(roundSpans.keys()).sort((a, b) => {
      const indexA = roundOrder.indexOf(a);
      const indexB = roundOrder.indexOf(b);
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });

    // Helper per ordinare i giocatori per days
    const sortByDays = (arr: any[]) => {
      return arr.sort((a, b) => {
        const [yA, dA] = a.days.split(/[y d]+/).filter(Boolean).map(Number);
        const [yB, dB] = b.days.split(/[y d]+/).filter(Boolean).map(Number);
        const daysA = (yA ?? 0) * 365 + (dA ?? 0);
        const daysB = (yB ?? 0) * 365 + (dB ?? 0);
        return daysB - daysA;
      });
    };

    const allRoundItems: any[] = [];

    // Winner (Top10 al primo avvio, fullList solo se richiesto)
    const sortedWinnerSpans = sortByDays(Array.from(winnerSpans.values())).filter(
      (p) => p.days !== "0y 0d"
    );
    allRoundItems.push({
      title: "Titles",
      list: full ? sortedWinnerSpans : sortedWinnerSpans.slice(0, 10),
      ...(full ? { fullList: sortedWinnerSpans } : {}),
    });

    // Rounds
    for (const round of sortedRounds) {
      if (filterRound && round !== filterRound) continue;

      const players = Array.from(roundSpans.get(round)!.values()).filter(
        (p) => p.days !== "0y 0d"
      );
      const sorted = sortByDays(players);

      allRoundItems.push({
        title: round,
        list: full ? sorted : sorted.slice(0, 10),
        ...(full ? { fullList: sorted } : {}),
      });
    }

    return NextResponse.json({ allRoundItems });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
