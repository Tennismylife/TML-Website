import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, context: any) {
  const url = new URL(request.url);
  const playerId = url.searchParams.get("id");

  if (!playerId) {
    return NextResponse.json(
      { error: "Parametro 'id' mancante" },
      { status: 400 }
    );
  }

  // In Next.js dynamic route handlers, `context.params` may be a Promise and must be awaited.
  const params = context?.params ? await context.params : undefined;
  const yearParam = params?.year;
  const yearNumber = parseInt(String(yearParam), 10);

  if (isNaN(yearNumber)) {
    return NextResponse.json(
      { error: "Parametro 'year' non valido" },
      { status: 400 }
    );
  }

  try {
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ winner_id: playerId }, { loser_id: playerId }],
        year: yearNumber,
      },
      orderBy: { tourney_date: "asc" },
    });

    return NextResponse.json(matches);
  } catch (err: any) {
    console.error("Errore recupero match:", err.message ?? err);
    return NextResponse.json(
      { error: "Errore server durante il recupero dei match" },
      { status: 500 }
    );
  }
}
