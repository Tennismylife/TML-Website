import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const results = await prisma.$queryRaw`
  SELECT player_name, player_id, COUNT(*)::int as played
  FROM (
    SELECT winner_name as player_name, winner_id as player_id, year
    FROM "Match"
    WHERE tourney_level = '250'
    UNION ALL
    SELECT loser_name as player_name, loser_id as player_id, year
    FROM "Match"
    WHERE tourney_level = '250'
  ) AS all_matches
  GROUP BY player_name, player_id
  ORDER BY played DESC
  LIMIT 20
`;

console.log('=== TOP ATP 250 MATCHES PLAYED ===');
results.forEach((r, i) => console.log(`${i+1}. ${r.player_name}: ${r.played}`));

const top5 = results.slice(0, 5);
for (const p of top5) {
  const years = await prisma.$queryRaw`
    SELECT MIN(year) as first_year, MAX(year) as last_year
    FROM (
      SELECT year FROM "Match" WHERE tourney_level = '250' AND winner_id = ${p.player_id}
      UNION ALL
      SELECT year FROM "Match" WHERE tourney_level = '250' AND loser_id = ${p.player_id}
    ) AS player_matches
  `;
  console.log(`  ${p.player_name}: ${years[0].first_year} - ${years[0].last_year}`);
}

await prisma.$disconnect();
