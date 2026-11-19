import type { Prisma } from "@prisma/client";
import { prismaForTour } from "@/lib/prisma";
import { getTour } from "@/lib/tour";

const WTA_FINALS_TOURNAMENT_ID = "808";

export async function statisticsCategoryFilter(level: string): Promise<Prisma.mVStatsWhereInput> {
  if (level === "all") return {};
  if (level !== "F" || await getTour() !== "WTA") return { tourney_level: level };

  // The historical F category also includes the WTA Elite Trophy.
  const finals = await prismaForTour("WTA").match.findMany({
    where: { tourney_id: WTA_FINALS_TOURNAMENT_ID, tourney_level: level },
    select: { id: true },
  });
  return { tourney_level: level, id: { in: finals.map(match => match.id) } };
}
