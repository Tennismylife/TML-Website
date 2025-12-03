import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const playerId = url.searchParams.get("id");

  if (!playerId) {
    return NextResponse.json({ error: "Parametro 'id' mancante" }, { status: 400 });
  }

  try {
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { winner_id: playerId },
          { loser_id: playerId }
        ],
        status: true,
      },
      select: {
        tourney_id: true,
        tourney_name: true,
        surface: true,
        draw_size: true,
        tourney_level: true,
        year: true,
        match_num: true,
        winner_id: true,
        winner_seed: true,
        winner_entry: true,
        winner_name: true,
        winner_hand: true,
        winner_ht: true,
        winner_ioc: true,
        winner_age: true,
        winner_rank: true,
        winner_rank_points: true,
        loser_id: true,
        loser_seed: true,
        loser_entry: true,
        loser_name: true,
        loser_hand: true,
        loser_ht: true,
        loser_ioc: true,
        loser_age: true,
        loser_rank: true,
        loser_rank_points: true,
        score: true,
        best_of: true,
        round: true,
        minutes: true,
        w_ace: true,
        w_df: true,
        w_svpt: true,
        w_1stIn: true,
        w_1stWon: true,
        w_2ndWon: true,
        w_SvGms: true,
        w_bpSaved: true,
        w_bpFaced: true,
        l_ace: true,
        l_df: true,
        l_svpt: true,
        l_1stIn: true,
        l_1stWon: true,
        l_2ndWon: true,
        l_SvGms: true,
        l_bpSaved: true,
        l_bpFaced: true,
      },
      orderBy: {
        tourney_date: "desc",
      },
    });

    return NextResponse.json(matches);
  } catch (err: any) {
    console.error("Errore recupero match:", err);
    return NextResponse.json(
      { error: "Errore server durante il recupero dei match" },
      { status: 500 }
    );
  }
}


