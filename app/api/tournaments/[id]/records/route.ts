import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function fetchTournamentData(id: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: parseInt(id) },
  });
  if (!tournament) return null;

  const normalizedTournament = {
    ...tournament,
    name: Array.isArray(tournament.name) ? tournament.name[0] : (typeof tournament.name === 'string' ? tournament.name : 'n/d'),
    city: Array.isArray(tournament.city) ? tournament.city[0] : (typeof tournament.city === 'string' ? tournament.city : null),
    country: Array.isArray(tournament.country) ? tournament.country[0] : (typeof tournament.country === 'string' ? tournament.country : null),
    ioc: Array.isArray(tournament.ioc) ? tournament.ioc[0] : (typeof tournament.ioc === 'string' ? tournament.ioc : null),
    surfaces: Array.isArray(tournament.surfaces) ? (tournament.surfaces as any[]) : [],
  };

  const allMatches = await prisma.match.findMany({
    where: {},
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

  const tournamentMatches = (allMatches as any[]).filter((m) => {
    const parts = String(m.tourney_id).split('-');
    const matchId = parts.length > 1 ? parseInt(parts[1]) : null;
    return matchId === tournament.id;
  });

  const finals = tournamentMatches.filter((m) => ["F", "W", "Final"].includes(m.round));

  return { normalizedTournament, tournamentMatches, finals };
}

export async function GET(request: NextRequest, context: any) {
    // support both Next.js versions where params can be a Promise or an object
    const params = await context?.params;
    const id = String(params?.id ?? '');

  const data = await fetchTournamentData(id);
  if (!data) {
    return NextResponse.json({ error: "Data not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}