import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const results = await prisma.$queryRaw`
  SELECT winner_name, winner_id, COUNT(*)::int as wins
  FROM "Match"
  WHERE tourney_level = '250'
  GROUP BY winner_name, winner_id
  ORDER BY wins DESC
  LIMIT 20
`;

console.log('=== TOP ATP 250 WINS ===');
results.forEach((r, i) => console.log(`${i+1}. ${r.winner_name}: ${r.wins}`));

// Also get first/last win year for top players
const top5 = results.slice(0, 5);
for (const p of top5) {
  const years = await prisma.$queryRaw`
    SELECT MIN(year) as first_year, MAX(year) as last_year
    FROM "Match"
    WHERE tourney_level = '250' AND winner_id = ${p.winner_id}
  `;
  console.log(`  ${p.winner_name}: ${years[0].first_year} - ${years[0].last_year}`);
}

await prisma.$disconnect();
