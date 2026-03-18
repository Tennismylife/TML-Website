const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const args = process.argv.slice(2);
  const name1 = args[0] || 'Nadal';
  const name2 = args[1] || 'Federer';

  const p1 = await prisma.player.findFirst({ where: { atpname: { contains: name1, mode: 'insensitive' } } });
  const p2 = await prisma.player.findFirst({ where: { atpname: { contains: name2, mode: 'insensitive' } } });

  if (!p1 || !p2) {
    console.error('One or both players not found:', { p1: !!p1, p2: !!p2 });
    process.exit(1);
  }

  console.log(`Found players:\n 1: ${p1.atpname} (id=${p1.id})\n 2: ${p2.atpname} (id=${p2.id})\n`);

  const matches = await prisma.match.findMany({
    where: {
      OR: [
        { winner_id: p1.id, loser_id: p2.id },
        { winner_id: p2.id, loser_id: p1.id },
      ],
      // we only consider valid matches (status true) to match app logic
      status: true,
    },
    orderBy: [{ tourney_date: 'asc' }],
  });

  // Exclude matches with special scores
  const counted = matches.filter(m => {
    const sc = (m.score || '').toUpperCase();
    if (!sc) return true;
    if (sc.includes('DEF') || sc.includes('W/O') || sc.includes('WEA')) return false;
    return true;
  });

  const last5 = counted.slice(-5);

  console.log('Total H2H matches (valid):', matches.length);
  console.log('Valid & counted matches (after filtering special scores):', counted.length);
  console.log('\nLast 5 counted matches (oldest -> newest):');

  last5.forEach((m, idx) => {
    const date = m.tourney_date ? m.tourney_date.toISOString().slice(0,10) : '----';
    const p1Result = m.winner_id === p1.id ? 'W' : m.loser_id === p1.id ? 'L' : '?';
    const p2Result = m.winner_id === p2.id ? 'W' : m.loser_id === p2.id ? 'L' : '?';
    console.log(`${idx+1}. ${date} | ${m.tourney_name || '-'} | ${m.surface || '-'} | score: ${m.score || '-'} | ${p1.atpname}: ${p1Result} | ${p2.atpname}: ${p2Result}`);
  });

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});