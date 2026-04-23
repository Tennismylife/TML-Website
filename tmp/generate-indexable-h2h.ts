import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const latestRankingDate = await prisma.rankingDate.findFirst({ orderBy: { date: 'desc' }, select: { id: true } });
  const latestRankingDateId = latestRankingDate?.id ?? null;
  const now = new Date();
  const last18Months = new Date(now);
  last18Months.setUTCMonth(last18Months.getUTCMonth() - 18);

  const activePlayers = new Set<string>();
  if (latestRankingDateId) {
    const rankings = await prisma.ranking.findMany({
      where: { rankingDateId: latestRankingDateId },
      select: { playerId: true },
    });
    rankings.forEach((r) => activePlayers.add(r.playerId));
    console.log(`Current ranking players: ${rankings.length}`);
  }

  const recentMatches = await prisma.match.findMany({
    where: {
      status: true,
      tourney_date: { gte: last18Months },
    },
    select: { winner_id: true, loser_id: true },
  });
  const recentPlayers = new Set<string>();
  recentMatches.forEach((m) => {
    if (m.winner_id) {
      activePlayers.add(m.winner_id);
      recentPlayers.add(m.winner_id);
    }
    if (m.loser_id) {
      activePlayers.add(m.loser_id);
      recentPlayers.add(m.loser_id);
    }
  });
  console.log(`Players with match in last 18 months: ${recentMatches.length} matches`);

  const top20Players = await prisma.ranking.findMany({
    where: { rank: { lte: 20 } },
    distinct: ['playerId'],
    select: { playerId: true },
  });
  const top20Set = new Set(top20Players.map((r) => r.playerId));
  const eligiblePlayers = new Set<string>([...activePlayers, ...top20Set]);
  const eligibleArray = Array.from(eligiblePlayers);

  const players = await prisma.player.findMany({
    where: { id: { in: eligibleArray } },
    select: { id: true, atpname: true, slug: true },
  });
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const h2hMatches = await prisma.match.findMany({
    where: {
      status: true,
      winner_id: { in: eligibleArray },
      loser_id: { in: eligibleArray },
    },
    select: { winner_id: true, loser_id: true },
  });
  const directH2H = new Set<string>();
  h2hMatches.forEach((m) => {
    if (!m.winner_id || !m.loser_id || m.winner_id === m.loser_id) return;
    const key = [m.winner_id, m.loser_id].sort().join('_');
    directH2H.add(key);
  });

  const csvPath = path.resolve(process.cwd(), 'tmp', 'h2h-indexable-pages.csv');
  const out = fs.createWriteStream(csvPath, { encoding: 'utf8' });
  out.write('player1_id,player1_name,player1_slug,player2_id,player2_name,player2_slug,url\n');

  const sortedEligible = eligibleArray.sort((a, b) => (playerMap.get(a)?.slug ?? '').localeCompare(playerMap.get(b)?.slug ?? ''));

  let rowCount = 0;
  for (let i = 0; i < sortedEligible.length; i++) {
    const p1id = sortedEligible[i];
    const p1 = playerMap.get(p1id);
    if (!p1) continue;
    for (let j = i + 1; j < sortedEligible.length; j++) {
      const p2id = sortedEligible[j];
      const p2 = playerMap.get(p2id);
      if (!p2) continue;

      const p1Active = activePlayers.has(p1id);
      const p2Active = activePlayers.has(p2id);
      const p1Recent = recentPlayers.has(p1id);
      const p2Recent = recentPlayers.has(p2id);
      const key = [p1id, p2id].sort().join('_');
      const hasDirectMatch = directH2H.has(key);

      // Include pair if both players played individually in the last 18 months
      if (p1Recent && p2Recent) {
        // include
      } else {
        if (!p1Active || !p2Active) {
          if (!hasDirectMatch) continue;
          if (!top20Set.has(p1id) && !top20Set.has(p2id)) continue;
        }
      }

      const url = `/h2h/${encodeURIComponent(p1.slug ?? p1.atpname?.toLowerCase().replace(/\s+/g, '-'))}-vs-${encodeURIComponent(p2.slug ?? p2.atpname?.toLowerCase().replace(/\s+/g, '-'))}`;
      out.write(`${p1id},"${(p1.atpname ?? '').replace(/"/g, '""')}",${p1.slug},${p2id},"${(p2.atpname ?? '').replace(/"/g, '""')}",${p2.slug},${url}\n`);
      rowCount += 1;
    }
  }

  out.end();
  console.log(`CSV generated at ${csvPath}`);
  console.log(`Rows written: ${rowCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
