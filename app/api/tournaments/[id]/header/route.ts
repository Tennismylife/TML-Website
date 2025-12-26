import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractUniqueSurfaces, extractNames } from '@/lib/utils';

export async function GET(request: NextRequest, context: any) {
  const params = await context?.params;
  const tournamentId = String(params?.id ?? "");

  if (!tournamentId) {
    return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
  }

  try {
    // 1️⃣ Recupera i dati base del torneo (supporta ID numerico o slug)
    let tournament: any = null;
    if (/^\d+$/.test(tournamentId)) {
      const idNum = parseInt(tournamentId, 10);
      tournament = await prisma.tournament.findUnique({
        where: { id: idNum }, // numeric id
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
          category: true,
          surfaces: true,
          indoor: true,
          slug: true,
        },
      });
    } else {
      // treat as slug: lookup by DB slug directly
      tournament = await prisma.tournament.findUnique({
        where: { slug: tournamentId },
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
          category: true,
          surfaces: true,
          indoor: true,
          slug: true,
        },
      });
    }

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // 2️⃣ Recupera le edizioni dal modello Match (query by numeric id)
    const editions = await prisma.match.findMany({
      where: { tourney_id: String(tournament.id) },
      distinct: ["year"],
      select: { year: true },
      orderBy: { year: "desc" },
    });

    const years = editions.map(e => e.year).filter((y): y is number => !!y);

    // 3️⃣ Combina dati torneo + edizioni, normalizza superfici (rimuove token 'indoor')
    //     e restituisce una sola istanza per ciascuna `category` (ordine preservato)
    const rawCategories = extractNames(tournament.category).map(s => String(s || '').trim()).filter(Boolean);
    const seenCats = new Set<string>();
    const uniqueCategories: string[] = [];
    for (const c of rawCategories) {
      const key = c.toUpperCase();
      if (seenCats.has(key)) continue;
      seenCats.add(key);
      uniqueCategories.push(c);
    }

    const sanitized = {
      id: tournament.id,
      name: tournament.name,
      city: tournament.city,
      country: tournament.country,
      category: uniqueCategories,
      surfaces: extractUniqueSurfaces(tournament.surfaces),
      slug: tournament.slug || null,
      editions: years,
    };

    return NextResponse.json(sanitized);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
