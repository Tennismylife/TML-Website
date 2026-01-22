const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const playerId = process.argv[2] || 'R075';
  const tourneyIdArg = process.argv[3] || '580';
  const tourneyId = Number(tourneyIdArg);
  const round = process.argv[4] || 'R32';
  const rows = await prisma.playerTournament.findMany({
    where: { player_id: playerId, tourney_id: tourneyId, round },
    select: { event_id: true }
  });
  const unique = [...new Set(rows.map(r => String(r.event_id)))];
  console.log({ playerId, tourneyId, round, rowsCount: rows.length, uniqueCount: unique.length, unique });
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});