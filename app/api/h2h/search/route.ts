import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");

  if (!q) {
    return NextResponse.json([], { status: 200 }); // nessun risultato se query vuota
  }

  try {
    const players = await prisma.player.findMany({
      where: {
        atpname: {
          contains: q,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        atpname: true,
        ioc: true,
      },
      take: 10, // massimo 10 risultati
    });

    return NextResponse.json(players);
  } catch (err) {
    console.error("Errore API search:", err);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}


