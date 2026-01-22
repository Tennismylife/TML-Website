const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const playerId = process.argv[2] || 'R075';
  const tid = process.argv[3] || '580';
  const round = process.argv[4] || 'R32';

  const tourneyIdFilters = [ { tourney_id: String(tid) }, { tourney_id: { endsWith: `-${tid}` } } ];

  const matches = await prisma.match.findMany({
    where: {
      AND: [
        { OR: tourneyIdFilters },
        { round }
      ],
      AND: [{ OR: [{ winner_id: playerId }, { loser_id: playerId }] }]
    },
    select: { id: true, event_id: true, year: true, tourney_name: true, tourney_date: true, winner_id: true, loser_id: true },
    orderBy: { tourney_date: 'asc' }
  });

  console.log({ totalMatches: matches.length });
  console.table(matches.map(m => ({ id: m.id, event: m.event_id, year: m.year, date: m.tourney_date, tn: m.tourney_name, winner: m.winner_id, loser: m.loser_id })), ['id','event','year','date','tn','winner','loser']);
  await prisma.$disconnect();
}

main().catch(err => { console.error(err); prisma.$disconnect(); process.exit(1); });