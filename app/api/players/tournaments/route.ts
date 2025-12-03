
// app/api/matches/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const playerIdRaw = url.searchParams.get("id");

  if (!playerIdRaw) {
    return NextResponse.json({ error: "Parametro 'id' mancante" }, { status: 400 });
  }

  // 🧼 Sanitize: usa stringhe e trim
  const playerId = playerIdRaw.trim();
  if (playerId.length === 0) {
    return NextResponse.json({ error: "Parametro 'id' vuoto" }, { status: 400 });
  }

  try {
    const matches = await prisma.match.findMany({
      // 🔎 Usa direttamente la stringa; niente Number()
      where: { OR: [{ winner_id: playerId }, { loser_id: playerId }] },
      select: {
        id: true,
        year: true,
        tourney_id: true,
        tourney_name: true,
        tourney_level: true,
        tourney_date: true,
        surface: true,
        round: true,
        winner_id: true,
        loser_id: true,
        w_svpt: true, l_svpt: true,
        w_ace: true,  l_ace: true,
        w_df: true,   l_df: true,
        w_1stIn: true,  l_1stIn: true,
        w_1stWon: true, l_1stWon: true,
        w_2ndWon: true, l_2ndWon: true,
        w_bpSaved: true, w_bpFaced: true,
        l_bpSaved: true, l_bpFaced: true,
        status: true,
      },
      orderBy: [{ year: "asc" }, { tourney_date: "asc" }],
    });

    const playerMatches = matches.map((m) => {
      // ✅ Confronto string-to-string con trim
      const winnerId = String(m.winner_id ?? "").trim();
      const loserId  = String(m.loser_id  ?? "").trim();
      const isWinner = winnerId === playerId;

      // Se vuoi contare solo i match validi/giocati
      const isValidMatch = m.status === true;

      // Statistiche dal punto di vista del player
      const svpt       = isWinner ? (m.w_svpt ?? 0)    : (m.l_svpt ?? 0);
      const aces       = isWinner ? (m.w_ace ?? 0)     : (m.l_ace ?? 0);
      const df         = isWinner ? (m.w_df ?? 0)      : (m.l_df ?? 0);
      const first_in   = isWinner ? (m.w_1stIn ?? 0)   : (m.l_1stIn ?? 0);
      const first_won  = isWinner ? (m.w_1stWon ?? 0)  : (m.l_1stWon ?? 0);
      const second_won = isWinner ? (m.w_2ndWon ?? 0)  : (m.l_2ndWon ?? 0);

      const bpFaced = isWinner ? (m.w_bpFaced ?? 0) : (m.l_bpFaced ?? 0);
      const bpSaved = isWinner ? (m.w_bpSaved ?? 0) : (m.l_bpSaved ?? 0);

      // Round: se il giocatore vince la finale, round = "W"
      let bestRound = m.round;
      if ((m.round === "F" && isWinner) || m.round === "W") {
        bestRound = "W";
      }

      return {
        id: m.id,
        year: m.year,
        tourney_id: m.tourney_id,
        tourney_name: m.tourney_name,
        tourney_level: m.tourney_level,
        tourney_date: m.tourney_date,
        surface: m.surface,
        round: bestRound,
        opponent_id: isWinner ? loserId : winnerId,
        M: isValidMatch ? 1 : 0,
        W: isValidMatch ? (isWinner ? 1 : 0) : 0,
        L: isValidMatch ? (isWinner ? 0 : 1) : 0,
        svpt,
        aces,
        df,
        first_in,
        first_won,
        second_won,
        BP: bpFaced,
        BP_Saved: bpSaved,
        BP_Conceded: Math.max(bpFaced - bpSaved, 0),
        status: m.status ?? null, // non forzare a true
      };
    });

    return NextResponse.json(playerMatches);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}
