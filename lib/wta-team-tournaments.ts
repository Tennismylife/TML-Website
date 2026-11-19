import { prismaForTour } from "@/lib/prisma";

export async function getWtaTeamTournamentIds() {
  const events = await prismaForTour("WTA").match.groupBy({
    by: ["tourney_id"],
    where: {
      tourney_id: { not: null },
      OR: [{ team_event: true }, { tourney_level: "D" }],
    },
  });
  return new Set(events.map(event => event.tourney_id));
}
