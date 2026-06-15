const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const lendlPlayer = await prisma.player.findFirst({ where: { atpname: 'Ivan Lendl' }, select: { id: true } });
    const lendlId = lendlPlayer?.id;
    console.log('Lendl id', lendlId);
    const row = await prisma.mVSameSeasonTitles.findFirst({ where: { player_id: lendlId, year: 1982 } });
    console.log('MV row', JSON.stringify(row, null, 2));
    const wins = await prisma.match.findMany({
      where: {
        year: 1982,
        winner_id: lendlId,
        team_event: false,
        NOT: { OR: [{ score: { contains: 'WEA' } }, { score: 'To play' }] },
      },
      select: { id: true, event_id: true, round: true, surface: true, score: true, year: true, tourney_level: true },
      orderBy: [{ event_id: 'asc' }, { round: 'asc' }],
    });
    const finals = wins.filter(w => w.round === 'F');
    console.log('Total finals wins', finals.length);
    console.log('Finals by surface count', JSON.stringify(finals.reduce((acc, w) => {
      acc[w.surface] = (acc[w.surface] || 0) + 1;
      return acc;
    }, {}), null, 2));
    console.log('Finals list', JSON.stringify(finals.map(w => ({ id: w.id, event_id: w.event_id, surface: w.surface, tourney_level: w.tourney_level, score: w.score })), null, 2));

    const ptWins = await prisma.playerTournament.findMany({
      where: {
        player_id: lendlId,
        year: 1982,
        round: 'W',
      },
      select: { event_id: true, surface: true, tourney_level: true, round: true, tourney_name: true },
      orderBy: [{ event_id: 'asc' }],
    });
    console.log('PlayerTournament tournament wins 1982 count', ptWins.length);
    console.log('PlayerTournament tournament wins list', JSON.stringify(ptWins, null, 2));
    const ptCarpetWins = ptWins.filter(w => w.surface === 'Carpet');
    console.log('PlayerTournament carpet tournament wins 1982 count', ptCarpetWins.length);
    console.log('PlayerTournament carpet tournament wins list', JSON.stringify(ptCarpetWins, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
