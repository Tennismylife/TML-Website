import { PrismaClient } from '@prisma/client';

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

  const top20Players = await prisma.ranking.findMany({
    where: { rank: { lte: 20 } },
    distinct: ['playerId'],
    select: { playerId: true },
  });
  const top20Ids = top20Players.map((r) => r.playerId);

  const top20Matches = await prisma.match.findMany({
    where: {
      status: true,
      OR: [
        { winner_id: { in: top20Ids } },
        { loser_id: { in: top20Ids } },
      ],
    },
    select: { winner_id: true, loser_id: true },
  });
  const top20WithMatch = new Set<string>();
  top20Matches.forEach((m) => {
    if (m.winner_id && top20Ids.includes(m.winner_id)) top20WithMatch.add(m.winner_id);
    if (m.loser_id && top20Ids.includes(m.loser_id)) top20WithMatch.add(m.loser_id);
  });
  top20WithMatch.forEach((id) => eligiblePlayers.add(id));

  const eligibleArray = Array.from(eligiblePlayers);
  console.log(`eligible players=${eligibleArray.length}`);

  const matches = await prisma.match.findMany({
    where: {
      status: true,
      winner_id: { in: eligibleArray },
      loser_id: { in: eligibleArray },
    },
    select: { winner_id: true, loser_id: true },
  });

  const pairSet = new Set<string>();
  for (const m of matches) {
    if (!m.winner_id || !m.loser_id || m.winner_id === m.loser_id) continue;
    const sorted = [m.winner_id, m.loser_id].sort();
    pairSet.add(`${sorted[0]}_${sorted[1]}`);
  }

  const everTop20Rows = await prisma.ranking.findMany({
    where: { rank: { lte: 20 } },
    distinct: ['playerId'],
    select: { playerId: true },
  });
  const everTop20 = new Set(everTop20Rows.map((r) => r.playerId));

  let both = 0;
  let one = 0;
  let none = 0;
  for (const key of pairSet) {
    const [a, b] = key.split('_');
    const a20 = everTop20.has(a);
    const b20 = everTop20.has(b);
    if (a20 && b20) both += 1;
    else if (a20 || b20) one += 1;
    else none += 1;
  }

  console.log(`pairs total=${pairSet.size}`);
  console.log(`both top20=${both}`);
  console.log(`one top20=${one}`);
  console.log(`none top20=${none}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});