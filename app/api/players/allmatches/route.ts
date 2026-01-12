// allmatches.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import {
  parseSets,
  hasDecidingTB,
  filterByResult,
  filterByRank,
  filterByAge,
  filterByHand,
  filterByEntry,
  filterBySetScore,
  checkRank
} from "./matchHelpers";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const playerId = url.searchParams.get("id");

  if (!playerId) {
    return NextResponse.json({ error: "Parametro 'id' mancante" }, { status: 400 });
  }

  const year = url.searchParams.get("year") ?? undefined;
  const level = url.searchParams.get("level") ?? undefined;
  const tourneyId = url.searchParams.get("tourney") ?? undefined;
  const surface = url.searchParams.get("surface") ?? undefined;
  const round = url.searchParams.get("round") ?? undefined;
  const result = url.searchParams.get("result") ?? undefined;
  const vsRank = url.searchParams.get("vsRank") ?? undefined;
  const vsAge = url.searchParams.get("vsAge") ?? undefined;
  const vsHand = url.searchParams.get("vsHand") ?? undefined;
  const vsBackhand = url.searchParams.get("vsBackhand") ?? undefined;
  const vsEntry = url.searchParams.get("vsEntry") ?? undefined;
  const asRank = url.searchParams.get("asRank") ?? undefined;
  const asEntry = url.searchParams.get("asEntry") ?? undefined;
  const set = url.searchParams.get("set") ?? undefined;
  const firstSet = url.searchParams.get("firstSet") ?? undefined;
  const score = url.searchParams.get("score") ?? undefined;

  try {
    const where: any = { OR: [{ winner_id: playerId }, { loser_id: playerId }] };
    if (year) where.year = parseInt(year);
    if (level) where.tourney_level = level;
    if (tourneyId && tourneyId !== "All") where.tourney_id = tourneyId;
    if (surface) where.surface = surface;
    if (round) where.round = round;

    const matches = await prisma.match.findMany({ where });

    let playerMap: Record<string, string | null> = {};
    if (vsBackhand) {
      const playerIds: string[] = Array.from(new Set(matches.flatMap(m => [m.winner_id, m.loser_id]).filter((id): id is string => id !== null)));
      const players = await prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, backhand: true }
      });
      playerMap = Object.fromEntries(players.map(p => [p.id, p.backhand]));
    }

    const filteredMatches = matches.filter((m) => {
      const isWinner = m.winner_id === playerId;
      const myRank = isWinner ? m.winner_rank : m.loser_rank;
      const oppRank = isWinner ? m.loser_rank : m.winner_rank;
      const mySeed = isWinner ? m.winner_seed : m.loser_seed;
      const oppSeed = isWinner ? m.loser_seed : m.winner_seed;
      const myEntry = isWinner ? m.winner_entry : m.loser_entry;
      const oppEntry = isWinner ? m.loser_entry : m.winner_entry;
      const myAge = isWinner ? m.winner_age : m.loser_age;
      const oppAge = isWinner ? m.loser_age : m.winner_age;
      const oppHand = isWinner ? m.loser_hand : m.winner_hand;
      const oppBack = vsBackhand ? (isWinner ? playerMap[m.loser_id ?? ''] : playerMap[m.winner_id ?? '']) : undefined;

      if (vsBackhand) {
        if (vsBackhand === "Two-handed" && oppBack !== "2H") return false;
        if (vsBackhand === "One-handed" && oppBack !== "1H") return false;
      }

      if (!filterByResult(m, isWinner, result)) return false;
      if (!filterByRank(myRank, oppRank, asRank, vsRank)) return false;
      if (!filterByAge(myAge ?? undefined, oppAge ?? undefined, vsAge)) return false;
      if (vsHand && !filterByHand(oppHand ?? '', vsHand)) return false;
      if (!filterByEntry(mySeed, oppSeed, myEntry ?? undefined, oppEntry ?? undefined, asEntry, vsEntry)) return false;
      if (!filterBySetScore(m, set, firstSet, score, isWinner)) return false;

      return true;
    });

    return NextResponse.json(filteredMatches);
  } catch (err) {
    console.error("Errore recupero match:", err);
    return NextResponse.json({ error: "Errore server durante il recupero dei match" }, { status: 500 });
  }
}
