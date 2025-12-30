import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractUniqueSurfaces } from '@/lib/utils';

async function fetchTournamentData(tourneyIds: string[]) {
  // If callers pass an array of tourney ids, pick a canonical numeric id for the tournament record.
  // Special-case: if both 580 and 581 are present (AO), prefer 580 as the canonical id.
  const firstId = tourneyIds.find(s => /^\d+$/.test(s));
  let canonicalId: string | null = null;
  if (tourneyIds.includes('580') && tourneyIds.includes('581')) {
    canonicalId = '580';
  } else if (firstId) {
    canonicalId = firstId;
  }

  let tournament: any = null;
  if (canonicalId) {
    tournament = await prisma.tournament.findUnique({ where: { id: parseInt(canonicalId, 10) } });
  } else {
    // fallback: try to find by name-derived slug matching
    const candidates = await prisma.tournament.findMany({ select: { id: true, name: true, city: true, country: true, surfaces: true } });
    // look for a candidate whose computed slug is in the provided list
    const found = candidates.find(t => tourneyIds.includes(String(t.id)));
    if (found) tournament = found as any;
  }

  if (!tournament) return null;

  const normalizedTournament = {
    ...tournament,
    name: Array.isArray(tournament.name) ? tournament.name[0] : (typeof tournament.name === 'string' ? tournament.name : 'n/d'),
    city: Array.isArray(tournament.city) ? tournament.city[0] : (typeof tournament.city === 'string' ? tournament.city : null),
    country: Array.isArray(tournament.country) ? tournament.country[0] : (typeof tournament.country === 'string' ? tournament.country : null),
    surfaces: extractUniqueSurfaces(Array.isArray(tournament.surfaces) ? tournament.surfaces : [tournament.surfaces]),
  };

  const tourneyIdFilters = tourneyIds.flatMap((tid: string) => [{ tourney_id: tid }, { tourney_id: { endsWith: `-${tid}` } }]);

  const allMatches = await prisma.match.findMany({
    where: { OR: tourneyIdFilters },
    select: {
      tourney_id: true,
      tourney_name: true,
      tourney_date: true,
      round: true,
      surface: true,
      winner_id: true,
      winner_name: true,
      winner_ioc: true,
      winner_age: true,
      loser_id: true,
      loser_name: true,
      loser_ioc: true,
      loser_age: true,
      score: true,
    } as any,
    orderBy: { tourney_date: "desc" },
  });

  // Normalize matches by ensuring the numeric tourney_id part is one of the provided tourneyIds
  const numericIdSet = new Set(tourneyIds.map(s => parseInt(s, 10)));
  const tournamentMatches = (allMatches as any[]).filter((m) => {
    const parts = String(m.tourney_id).split('-');
    const matchId = parts.length > 1 ? parseInt(parts[1]) : parseInt(parts[0]);
    return numericIdSet.has(matchId);
  });

  const finals = tournamentMatches.filter((m) => ["F", "W", "Final"].includes(m.round));

  return { normalizedTournament, tournamentMatches, finals };
}

export async function GET(request: NextRequest, context: any) {
    // support both Next.js versions where params can be a Promise or an object
    const params = await context?.params;
    const id = String(params?.id ?? '');

  // resolve id param to tourney ids
  const tourneyIds = await (await import('@/lib/tournament')).resolveTourneyIds(id);
  if (!tourneyIds) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const data = await fetchTournamentData(tourneyIds);
  if (!data) {
    return NextResponse.json({ error: "Data not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}