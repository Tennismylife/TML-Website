import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const results = await prisma.$queryRaw`
  SELECT player_name, player_id, player_ioc, COUNT(*)::int as played
  FROM (
    SELECT winner_name as player_name, winner_id as player_id, winner_ioc as player_ioc
    FROM "Match"
    WHERE best_of = 3
    UNION ALL
    SELECT loser_name as player_name, loser_id as player_id, loser_ioc as player_ioc
    FROM "Match"
    WHERE best_of = 3
  ) AS all_matches
  GROUP BY player_name, player_id, player_ioc
  ORDER BY played DESC
  LIMIT 20
`;

console.log('=== TOP BEST-OF-3 MATCHES PLAYED ===');
results.forEach((r, i) => console.log(`${i+1}. ${r.player_name} (${r.player_ioc ?? 'N/A'}): ${r.played}`));

const top5 = results.slice(0, 5);
for (const p of top5) {
  const years = await prisma.$queryRaw`
    SELECT MIN(year) as first_year, MAX(year) as last_year
    FROM (
      SELECT year FROM "Match" WHERE best_of = 3 AND winner_id = ${p.player_id}
      UNION ALL
      SELECT year FROM "Match" WHERE best_of = 3 AND loser_id = ${p.player_id}
    ) AS player_matches
  `;
  console.log(`  ${p.player_name}: ${years[0].first_year} - ${years[0].last_year}`);
}

await prisma.$disconnect();
