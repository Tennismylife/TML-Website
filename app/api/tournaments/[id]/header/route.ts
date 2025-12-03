import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, context: any) {
  const params = await context?.params;
  const tournamentId = String(params?.id ?? "");

  if (!tournamentId) {
    return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
  }

  try {
    // 1️⃣ Recupera i dati base del torneo
    const tournament = await prisma.tournament.findUnique({
      where: { id: parseInt(tournamentId) }, // 👈 supponendo che tournament.id sia Int
      select: {
        id: true,
        name: true,
        city: true,
        country: true,
        category: true,
        surfaces: true,
        indoor: true,
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // 2️⃣ Recupera le edizioni dal modello Match
    const editions = await prisma.match.findMany({
      where: { tourney_id: tournamentId },
      distinct: ["year"],
      select: { year: true },
      orderBy: { year: "desc" },
    });

    const years = editions.map(e => e.year).filter((y): y is number => !!y);

    // 3️⃣ Combina dati torneo + edizioni
    const result = {
      ...tournament,
      editions: years,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching tournament header and editions:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
