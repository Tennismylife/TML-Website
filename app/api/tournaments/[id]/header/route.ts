import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractUniqueSurfaces, extractNames } from '@/lib/utils';
import { resolveCanonicalTourneyId, resolveTourneyIds } from '@/lib/tournament';

export async function GET(request: NextRequest, context: any) {
  const params = await context?.params;
  const tournamentId = params?.id ? String(params.id) : "";

  if (!tournamentId) {
    return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
  }

  try {
    // 1️⃣ Recupera i dati base del torneo (supporta ID numerico o slug)
    let tournament: any = null;
    if (/^\d+$/.test(tournamentId)) {
      // Try to find the exact tournament row by numeric id first (so /tournaments/581 maps to id 581 if present)
      const idNumExact = parseInt(tournamentId, 10);
      // Try to read the tournament and prefer the new `atp_category` field if available.
      try {
        tournament = await prisma.tournament.findUnique({
          where: { id: idNumExact },
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
      } catch (err) {
        // Fallback for older schema: try selecting `category` instead and map to atp_category
        tournament = await prisma.tournament.findUnique({
          where: { id: idNumExact },
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
        if (tournament && (tournament as any).category) (tournament as any).atp_category = (tournament as any).category;
      }

      // If not found as exact id, fall back to canonical mapping (e.g. 581 -> 580)
      if (!tournament) {
        const canonical = await resolveCanonicalTourneyId(tournamentId);
        if (!canonical) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
        const idNum = parseInt(canonical, 10);
        try {
          tournament = await prisma.tournament.findUnique({
            where: { id: idNum },
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
        } catch (err) {
          tournament = await prisma.tournament.findUnique({
            where: { id: idNum },
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
          if (tournament && (tournament as any).category) (tournament as any).atp_category = (tournament as any).category;
        }
      }
    } else {
      // treat as slug: lookup by DB slug directly
      try {
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
      } catch (err) {
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
        if (tournament && (tournament as any).category) (tournament as any).atp_category = (tournament as any).category;
      }
    }

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // 2️⃣ Recupera le edizioni dal modello Match
    // If we resolved an exact numeric id (e.g., id=581), use only that id to fetch editions.
    // Otherwise, use resolveTourneyIds to include multi-id mappings (e.g., slug -> [580,581]).
    let tourneyIds: string[] | null = null;
    if (/^\d+$/.test(tournamentId) && tournament && Number(tournament.id) === parseInt(tournamentId, 10)) {
      tourneyIds = [String(tournament.id)];
    } else {
      tourneyIds = await resolveTourneyIds(tournamentId);
    }

    const tourneyIdFilters = (tourneyIds || [String(tournament.id)]).flatMap((tid: string) => [{ tourney_id: tid }, { tourney_id: { endsWith: `-${tid}` } }]);
    const editions = await prisma.match.findMany({
      where: { OR: tourneyIdFilters },
      distinct: ["year"],
      select: { year: true },
      orderBy: { year: "desc" },
    });

    // Build a full consecutive years range from earliest to latest (inclusive)
    const rawYears = editions.map(e => Number(e.year)).filter((y): y is number => !!y);
    const fullYears = rawYears.length ? (function() {
      const minYear = Math.min(...rawYears);
      const maxYear = Math.max(...rawYears);
      const arr: number[] = [];
      for (let y = maxYear; y >= minYear; y--) arr.push(y);
      return arr;
    })() : [];

    // 3️⃣ Combina dati torneo + edizioni, normalizza superfici (rimuove token 'indoor')
    //     e restituisce una sola istanza per ciascuna `category` (ordine preservato)
    // Use `atp_category` if present, otherwise fall back to raw `category` JSONB from DB
    const rawCategories = extractNames(tournament.atp_category ?? tournament.category).map(s => String(s || '').trim()).filter(Boolean);
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
      editions: fullYears,
    };

    return NextResponse.json(sanitized);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
