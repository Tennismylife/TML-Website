import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const roundOrder: Record<string, number> = {
  "R256": 1,
  "R128": 2,
  "R64": 3,
  "R32": 4,
  "R16": 5,
  "QF": 6,
  "SF": 7,
  "F": 8,
};

export async function GET(request: NextRequest, context: any) {
  const params = await context?.params;
  const id = String(params?.id ?? "");
  const yearRaw = String(params?.year ?? "");
  const year = Number.parseInt(yearRaw, 10);

  const tournamentId = parseInt(id);

  if (isNaN(tournamentId) || isNaN(year)) {
    return Response.json({ error: 'Invalid params' }, { status: 400 });
  }

  const matches = await prisma.match.findMany({
    where: { 
      tourney_id: id,
      year: year
    },
  });

  // Ordino i match in base all'ordine dei round
  matches.sort((a, b) => {
    const orderA = roundOrder[a.round] ?? 999;
    const orderB = roundOrder[b.round] ?? 999;
    return orderA - orderB;
  });

  return Response.json({ matches });
}
