import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const playerId = url.searchParams.get("id");

  if (!playerId) {
    return NextResponse.json({ error: "Parametro 'id' mancante" }, { status: 400 });
  }

  try {
    // Recupera tutti i match dove il giocatore Ã¨ vincitore o perdente e status = true
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { winner_id: playerId },
          { loser_id: playerId }
        ],
        status: true
      }
    });

    return NextResponse.json(matches);
  } catch (err: any) {
    console.error("Errore recupero match:", err.message);
    return NextResponse.json({ error: "Errore server durante il recupero dei match" }, { status: 500 });
  }
}


