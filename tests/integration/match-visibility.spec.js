/*
 * Simple integration test that runs the match visibility check using the running dev server.
 * To run locally: ensure `npm run dev` is running, then `node tests/integration/match-visibility.spec.js`.
 * This is a lightweight test. For CI, you can wire it into Playwright or a similar runner.
 */

const { PrismaClient } = require('@prisma/client');
const fetch = (...args) => import('node-fetch').then(m => m.default(...args));
const prisma = new PrismaClient();

(async () => {
  try {
    const base = process.env.BASE_URL || 'http://localhost:3000';

    const winnerId = 'p_test_a';
    const loserId = 'p_test_b';
    const tourneyId = '999999';
    const year = 2025;

    // ensure players
    await prisma.player.upsert({ where: { id: winnerId }, update: { atpname: 'Test A' }, create: { id: winnerId, atpname: 'Test A', player: 'test_a' } });
    await prisma.player.upsert({ where: { id: loserId }, update: { atpname: 'Test B' }, create: { id: loserId, atpname: 'Test B', player: 'test_b' } });

    const last = await prisma.match.findFirst({ orderBy: { id: 'desc' } });
    const newId = (last?.id ?? 0) + 1;

    await prisma.match.create({ data: {
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

    // small wait for route readiness
    await new Promise((r) => setTimeout(r, 500));

    // query endpoints
    const p1 = await (await fetch(`${base}/api/players/allmatches?id=${winnerId}&year=${year}`)).json();
    const p2 = await (await fetch(`${base}/api/tournaments/${tourneyId}/${year}`)).json();

    const foundInPlayers = Array.isArray(p1) ? p1.some(m => m.id === newId) : (Array.isArray(p1.matches) ? p1.matches.some(m=>m.id===newId) : false);
    const foundInTourney = Array.isArray(p2.matches) ? p2.matches.some(m => m.id === newId) : false;

    console.log('foundInPlayers', foundInPlayers, 'foundInTourney', foundInTourney);

    // cleanup
    await prisma.match.delete({ where: { id: newId } });
    await prisma.player.deleteMany({ where: { id: { in: [winnerId, loserId] } } });

    await prisma.$disconnect();

    if (foundInPlayers && foundInTourney) {
      console.log('OK');
      process.exit(0);
    } else {
      console.error('MISMATCH - players:', foundInPlayers, 'tournaments:', foundInTourney);
      process.exit(2);
    }

  } catch (err) {
    console.error('ERROR', err);
    try { await prisma.$disconnect(); } catch(e){}
    process.exit(3);
  }
})();