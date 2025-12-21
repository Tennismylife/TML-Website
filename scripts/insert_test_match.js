const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main(){
  const winnerId = 'p_test_a';
  const loserId = 'p_test_b';
  const tourneyId = '999999';
  const year = 2025;

  await prisma.player.upsert({ where: { id: winnerId }, update: { atpname: 'Test A' }, create: { id: winnerId, atpname: 'Test A', player: 'test_a' } });
  await prisma.player.upsert({ where: { id: loserId }, update: { atpname: 'Test B' }, create: { id: loserId, atpname: 'Test B', player: 'test_b' } });

  const last = await prisma.match.findFirst({ orderBy: { id: 'desc' } });
  const newId = (last?.id ?? 0) + 1;

  const created = await prisma.match.create({ data: {
    id: newId,
    year: year,
    tourney_id: tourneyId,
    tourney_name: 'Test Tourney',
    surface: 'Hard',
    round: 'R32',
    winner_id: winnerId,
    loser_id: loserId,
    winner_name: 'Test A',
    loser_name: 'Test B',
    winner_rank: 1,
    loser_rank: 2,
    score: '6-0 6-0',
    best_of: 3,
    minutes: 60,
    tourney_date: new Date()
  }});

  console.log('Inserted match id=', created.id);
  await prisma.$disconnect();
}

main().catch(e=>{console.error(e);process.exit(1)});
