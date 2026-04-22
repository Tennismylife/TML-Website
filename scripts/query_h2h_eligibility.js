const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const names = ['Danilo Marcelino', 'Pablo Arraya'];
    const players = await prisma.player.findMany({ where: { atpname: { in: names } }, select: { id: true, atpname: true, slug: true } });
    console.log('players', players);
    if (players.length === 2) {
      const [p1, p2] = players;
      const match = await prisma.match.findFirst({
        where: {
          status: true,
          OR: [
            { winner_id: p1.id, loser_id: p2.id },
            { winner_id: p2.id, loser_id: p1.id },
          ],
        },
        select: { id: true, year: true, winner_id: true, loser_id: true, winner_name: true, loser_name: true },
      });
      console.log('directMatch', match);
      const latestRankingDate = await prisma.rankingDate.findFirst({ orderBy: { date: 'desc' }, select: { id: true } });
      console.log('latestRankingDate', latestRankingDate);
      const [p1Active, p2Active] = await Promise.all([
        prisma.ranking.findFirst({ where: { playerId: p1.id, rankingDateId: latestRankingDate?.id ?? null }, select: { id: true } }),
        prisma.ranking.findFirst({ where: { playerId: p2.id, rankingDateId: latestRankingDate?.id ?? null }, select: { id: true } }),
      ]);
      console.log('active', { p1Active: Boolean(p1Active), p2Active: Boolean(p2Active) });
      const last18Months = new Date(); last18Months.setUTCMonth(last18Months.getUTCMonth() - 18);
      const [p1Recent, p2Recent] = await Promise.all([
        prisma.match.findFirst({ where: { status: true, tourney_date: { gte: last18Months }, OR: [ { winner_id: p1.id }, { loser_id: p1.id } ], }, select: { id: true } }),
        prisma.match.findFirst({ where: { status: true, tourney_date: { gte: last18Months }, OR: [ { winner_id: p2.id }, { loser_id: p2.id } ], }, select: { id: true } }),
      ]);
      console.log('recent', { p1Recent: Boolean(p1Recent), p2Recent: Boolean(p2Recent) });
      const [p1Top20, p2Top20] = await Promise.all([
        prisma.ranking.findFirst({ where: { playerId: p1.id, rank: { lte: 20 } }, select: { id: true } }),
        prisma.ranking.findFirst({ where: { playerId: p2.id, rank: { lte: 20 } }, select: { id: true } }),
      ]);
      console.log('everTop20', { p1Top20: Boolean(p1Top20), p2Top20: Boolean(p2Top20) });
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
})();
