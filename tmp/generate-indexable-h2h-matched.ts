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

  const eligiblePlayers = new Set<string>();

  if (latestRankingDateId) {
    const rankings = await prisma.ranking.findMany({
      where: { rankingDateId: latestRankingDateId },
      select: { playerId: true },
    });
    rankings.forEach((r) => eligiblePlayers.add(r.playerId));
    console.log(`Current ranking players: ${rankings.length}`);
  } else {
    console.log('No latest ranking date found.');
  }

  const recentMatches = await prisma.match.findMany({
    where: {
      status: true,
      tourney_date: { gte: last18Months },
    },
    select: { winner_id: true, loser_id: true },
  });
  recentMatches.forEach((m) => {
    if (m.winner_id) eligiblePlayers.add(m.winner_id);
    if (m.loser_id) eligiblePlayers.add(m.loser_id);
  });
  console.log(`Players with match in last 18 months: ${recentMatches.length} matches`);

  const top20Players = await prisma.ranking.findMany({
    where: { rank: { lte: 20 } },
    distinct: ['playerId'],
    select: { playerId: true },
  });
  const top20IdArray = top20Players.map((r) => r.playerId);

  const top20Matches = await prisma.match.findMany({
    where: {
      status: true,
      OR: [
        { winner_id: { in: top20IdArray } },
        { loser_id: { in: top20IdArray } },
      ],
    },
    select: { winner_id: true, loser_id: true },
  });
  const top20WithMatch = new Set<string>();
  top20Matches.forEach((m) => {
    if (m.winner_id && top20IdArray.includes(m.winner_id)) top20WithMatch.add(m.winner_id);
    if (m.loser_id && top20IdArray.includes(m.loser_id)) top20WithMatch.add(m.loser_id);
  });
  top20WithMatch.forEach((id) => eligiblePlayers.add(id));
  console.log(`Top 20 players with at least one H2H match: ${top20WithMatch.size}`);

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
    select: {
      winner_id: true,
      loser_id: true,
    },
  });

  const pairCountMap = new Map<string, number>();
  h2hMatches.forEach((m) => {
    if (!m.winner_id || !m.loser_id || m.winner_id === m.loser_id) return;
    const pair = [m.winner_id, m.loser_id].sort();
    const key = `${pair[0]}_${pair[1]}`;
    pairCountMap.set(key, (pairCountMap.get(key) ?? 0) + 1);
  });

  const rows: Array<{ p1: string; p2: string; count: number }> = [];
  for (const [key, count] of pairCountMap.entries()) {
    const [p1id, p2id] = key.split('_');
    rows.push({ p1: p1id, p2: p2id, count });
  }

  rows.sort((a, b) => {
    const slugA1 = playerMap.get(a.p1)?.slug ?? '';
    const slugA2 = playerMap.get(a.p2)?.slug ?? '';
    const slugB1 = playerMap.get(b.p1)?.slug ?? '';
    const slugB2 = playerMap.get(b.p2)?.slug ?? '';
    return slugA1 === slugB1 ? slugA2.localeCompare(slugB2) : slugA1.localeCompare(slugB1);
  });

  const csvPath = path.resolve(process.cwd(), 'tmp', 'h2h-indexable-pages-matched.csv');
  const out = fs.createWriteStream(csvPath, { encoding: 'utf8' });
  out.write('player1_id,player1_name,player1_slug,player2_id,player2_name,player2_slug,match_count,url\n');

  const top20IdSet = new Set(top20Players.map((r) => r.playerId));
  let writtenCount = 0;
  rows.forEach(({ p1, p2, count }) => {
    if (!top20IdSet.has(p1) && !top20IdSet.has(p2)) return;
    const pl1 = playerMap.get(p1);
    const pl2 = playerMap.get(p2);
    if (!pl1 || !pl2) return;
    const url = `/h2h/${encodeURIComponent(pl1.slug ?? pl1.atpname?.toLowerCase().replace(/\s+/g, '-'))}-vs-${encodeURIComponent(pl2.slug ?? pl2.atpname?.toLowerCase().replace(/\s+/g, '-'))}`;
    out.write(`${p1},"${(pl1.atpname ?? '').replace(/"/g, '""')}",${pl1.slug},${p2},"${(pl2.atpname ?? '').replace(/"/g, '""')}",${pl2.slug},${count},${url}\n`);
    writtenCount += 1;
  });

  out.end();
  console.log(`CSV generated at ${csvPath}`);
  console.log(`H2H pairs with at least one match and at least one ex Top20 player: ${writtenCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});