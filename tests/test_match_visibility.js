/*
 * test_match_visibility.js
 * Usage: BASE_URL=http://localhost:3000 node scripts/test_match_visibility.js
 *
 * Inserts a temporary match and test players, calls both endpoints that should expose it,
 * then cleans up. Exits with code 0 on success, non-zero on failure.
 */

const { PrismaClient } = require('@prisma/client');
// node-fetch v3 is ESM-only; load dynamically for CommonJS environments
const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));

const prisma = new PrismaClient();

const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

async function main(){
  console.log('Starting match visibility test against', BASE);

  // find max id
  const last = await prisma.match.findFirst({ orderBy: { id: 'desc' } });
  const newId = (last?.id ?? 0) + 1;
  const tourneyId = '999999';
  const year = 2025;
  const winnerId = 'p_test_a';
  const loserId = 'p_test_b';

  try{
    // ensure players exist (upsert)
    await prisma.player.upsert({
      where: { id: winnerId },
      update: { atpname: 'Test A' },
      create: { id: winnerId, atpname: 'Test A', player: 'test_a' }
    });
    await prisma.player.upsert({
      where: { id: loserId },
      update: { atpname: 'Test B' },
      create: { id: loserId, atpname: 'Test B', player: 'test_b' }
    });

    // insert match
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

    console.log('Inserted test match id=', created.id);

    // wait a bit for any caches or listeners
    await sleep(1000);

    // call players/allmatches for winner
    const url1 = new URL('/api/players/allmatches', BASE);
    url1.searchParams.set('id', winnerId);
    url1.searchParams.set('year', String(year));

    const r1 = await fetch(url1.toString());
    const p1 = await r1.json();

    // call tournament endpoint
    const url2 = `${BASE}/api/tournaments/${tourneyId}/${year}`;
    const r2 = await fetch(url2);
    const p2 = await r2.json();

    const foundInPlayers = Array.isArray(p1) ? p1.some(m => m.id === newId) : (Array.isArray(p1.matches) ? p1.matches.some(m=>m.id===newId) : false);
    const foundInTourney = Array.isArray(p2.matches) ? p2.matches.some(m => m.id === newId) : false;

    console.log('players endpoint result size:', Array.isArray(p1) ? p1.length : (p1.matches ? p1.matches.length : 'unknown'));
    console.log('tournament endpoint result size:', p2.matches ? p2.matches.length : 'unknown');
    console.log('foundInPlayers:', foundInPlayers);
    console.log('foundInTourney:', foundInTourney);

    // cleanup
    await prisma.match.delete({ where: { id: newId } });
    // optionally delete players
    await prisma.player.deleteMany({ where: { id: { in: [winnerId, loserId] } } });

    await prisma.$disconnect();

    if (foundInPlayers && foundInTourney){
      console.log('SUCCESS: match visible in both endpoints');
      process.exit(0);
    } else {
      console.error('FAIL: visibility mismatch');
      process.exit(2);
    }

  } catch (err){
    console.error('ERROR during test:', err);
    try{ await prisma.$disconnect(); }catch(e){}
    process.exit(3);
  }
}

main();
