require('dotenv').config();
const { prisma } = require('../lib/prisma');
(async () => {
  const top = 100;
  const rows = await prisma.ranking.findMany({
    where: { rank: { lte: top } },
    select: { playerId: true, player: { select: { birthdate: true } }, rankingDate: { select: { date: true } } },
  });
  console.log('rows count', rows.length);
  const valid = rows.filter(r => r.player && r.player.birthdate && r.rankingDate.date >= r.player.birthdate);
  console.log('valid entries', valid.length);
  const byPlayer = new Map();
  for (const r of valid) {
    const id = r.playerId;
    const birth = r.player.birthdate;
    const date = r.rankingDate.date;
    const ageDays = Math.floor((date.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    const prev = byPlayer.get(id);
    if (!prev || ageDays > prev.ageDays) {
      byPlayer.set(id, { ageDays });
    }
  }
  console.log('players with oldest', byPlayer.size);
  await prisma.$disconnect();
})();
