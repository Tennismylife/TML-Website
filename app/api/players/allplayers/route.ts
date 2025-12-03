import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const players = await prisma.player.findMany({
      orderBy: { atpname: "asc" },
      select: {
        id: true,
        atpname: true,
        coaches: true,
        ioc: true,
        hand: true,
        birthdate: true,
        height: true,
        weight: true,
        turnedpro: true,
        backhand: true, // Assicurati che esista nel tuo modello Player
      },
    });

    return NextResponse.json(players);
  } catch (err) {
    console.error("Errore recupero players:", err);
    return NextResponse.json(
      { error: "Errore server durante il recupero dei player" },
      { status: 500 }
    );
  }
}

