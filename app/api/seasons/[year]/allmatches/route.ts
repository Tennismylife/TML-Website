import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSlug } from "@/lib/utils";

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

    // Best-effort: attach `tourney_slug` from tournaments table so clients
    // can link using slugs instead of raw ids.
    try {
      const tourneyIdParts = Array.from(new Set(matches.map((m: any) => {
        const s = String(m.tourney_id || '').trim();
        const parts = s.split('-').filter(Boolean);
        return parts.length === 2 ? parts[1] : s;
      }).filter(Boolean)));

      let tourneyMap: Record<string, string | null> = {};
      if (tourneyIdParts.length) {
        const tours = await prisma.tournament.findMany({ where: { id: { in: tourneyIdParts.map(v => Number(v)) } }, select: { id: true, slug: true, name: true } });
        tourneyMap = tours.reduce((acc: Record<string, string | null>, t: any) => { acc[String(t.id)] = t.slug ?? createSlug(t.name ?? String(t.id)); return acc; }, {});
      }

      const enriched = matches.map((m: any) => {
        const s = String(m.tourney_id || '').trim();
        const parts = s.split('-').filter(Boolean);
        const idPart = parts.length === 2 ? parts[1] : s;
        return { ...m, tourney_slug: idPart ? (tourneyMap[String(idPart)] ?? null) : null };
      });

      return NextResponse.json(enriched);
    } catch (e) {
      console.warn('Failed to enrich tourney_slug in seasons allmatches route', e);
      return NextResponse.json(matches);
    }
  } catch (err: any) {
    console.error("Errore recupero match:", err.message ?? err);
    return NextResponse.json(
      { error: "Errore server durante il recupero dei match" },
      { status: 500 }
    );
  }
}
