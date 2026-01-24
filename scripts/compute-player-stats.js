(async () => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const playerId = process.argv[2] || 'TD51';
  try {
    const matches = await prisma.match.findMany({
      where: { OR: [{ winner_id: playerId }, { loser_id: playerId }] },
      select: {
        winner_id: true,
        loser_id: true,
        round: true,
        surface: true,
        team_event: true,
        status: true,
      },
    });

    const stats = {
      titles: 0,
      finals: 0,
      wins: 0,
      losses: 0,
      surfaces: { Hard: { w:0,l:0,titles:0 }, Clay:{w:0,l:0,titles:0}, Grass:{w:0,l:0,titles:0}, Carpet:{w:0,l:0,titles:0} }
    };

    for (const m of matches) {
      const isWinner = m.winner_id === playerId;
      const isFinal = m.round === 'F';
      const surface = m.surface;
      const isNonCounting = m.status === false;

      if (!isNonCounting) {
        if (isWinner) stats.wins++; else stats.losses++;
      }

      if (isFinal) {
        stats.finals++;
        const wonFinal = m.winner_id === playerId;
        if (wonFinal && m.team_event !== true) {
          stats.titles++;
          if (surface && stats.surfaces[surface]) stats.surfaces[surface].titles++;
        }
      }

      if (surface && stats.surfaces[surface]) {
        if (!isNonCounting) {
          if (isWinner) stats.surfaces[surface].w++; else stats.surfaces[surface].l++;
        }
      }
    }

    const total = stats.wins + stats.losses;
    const pct = total > 0 ? (stats.wins / total * 100).toFixed(1) : 'N/A';

    console.log(`Player ${playerId} stats:`);
    console.log(`${stats.wins}-${stats.losses} (${pct}%)`);
    console.log('Titles:', stats.titles);
    console.log('Titles by surface:', stats.surfaces);
  } catch (e) {
    console.error('Error', e);
  } finally {
    await prisma.$disconnect();
  }
})();