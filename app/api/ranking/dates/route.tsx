// File: app/api/ranking/dates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  try {
    // Recupera tutte le date presenti in RankingDate ordinate dalla più recente
    const dates = await prisma.rankingDate.findMany({
      select: { date: true },
      orderBy: { date: "desc" },
    });

    // Restituisci solo i valori come array di stringhe
    const dateStrings = dates.map(d => d.date.toISOString().split("T")[0]);

    return NextResponse.json({ dates: dateStrings });
  } catch (err: any) {
    console.error("Errore recupero date:", err.message);
    return NextResponse.json(
      { error: "Errore server durante il recupero delle date" },
      { status: 500 }
    );
  }
}
