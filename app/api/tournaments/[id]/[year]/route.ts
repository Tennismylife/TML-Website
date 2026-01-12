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

  if (isNaN(year)) {
    return Response.json({ error: 'Invalid params' }, { status: 400 });
  }

  // resolve id param (supports numeric id or slug)
  const tourneyIds = await (await import('@/lib/tournament')).resolveTourneyIds(id);
  if (!tourneyIds) return Response.json({ error: 'Tournament not found' }, { status: 404 });

  const yearNum = Number(year);

  const tourneyIdFilters = tourneyIds.flatMap((tid: string) => [{ tourney_id: tid }, { tourney_id: { endsWith: `-${tid}` } }]);

  const matches = await prisma.match.findMany({
    where: {
      OR: tourneyIdFilters,
      year: yearNum,
    },
  });

  // Ordino i match in base all'ordine dei round
  matches.sort((a, b) => {
    const orderA = roundOrder[String(a.round)] ?? 999;
    const orderB = roundOrder[String(b.round)] ?? 999;
    return orderA - orderB;
  });

  return Response.json({ matches });
}
