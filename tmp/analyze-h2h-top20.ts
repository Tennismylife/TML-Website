import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.match.findMany({
    where: { status: true },
    select: { winner_id: true, loser_id: true },
  });

  const pairSet = new Set<string>();
  for (const m of matches) {
    if (!m.winner_id || !m.loser_id || m.winner_id === m.loser_id) continue;
    const sorted = [m.winner_id, m.loser_id].sort();
    pairSet.add(`${sorted[0]}_${sorted[1]}`);
  }

  const top20Rows = await prisma.ranking.findMany({
    where: { rank: { lte: 20 } },
    distinct: ['playerId'],
    select: { playerId: true },
  });
  const top20Set = new Set(top20Rows.map((r) => r.playerId));

  let both = 0;
  let one = 0;
  let none = 0;

  for (const key of pairSet) {
    const [a, b] = key.split('_');
    const a20 = top20Set.has(a);
    const b20 = top20Set.has(b);
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