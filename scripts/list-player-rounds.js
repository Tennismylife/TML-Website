const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const playerId = process.argv[2] || 'A0E2';
  const round = process.argv[3] || 'SF';

  const rows = await prisma.playerTournament.findMany({
    where: { player_id: playerId, round },
    select: { event_id: true, tourney_name: true, year: true }
  });

  const unique = Array.from(new Map(rows.map(r => [String(r.event_id), r])).values());
  unique.sort((a,b) => (b.year || 0) - (a.year || 0));

  console.log(`${playerId} — round=${round} — rows=${rows.length} — uniqueEvents=${unique.length}`);
  unique.forEach(r => console.log(`${r.event_id}  | ${r.year || '-'} | ${r.tourney_name || '-'}`));

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});