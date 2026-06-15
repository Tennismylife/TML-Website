import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const results = await prisma.$queryRaw`
  SELECT winner_name, winner_id, COUNT(*)::int as wins,
    MIN(year) as first_year, MAX(year) as last_year
  FROM "Match"
  WHERE tourney_level = '500'
  GROUP BY winner_name, winner_id
  ORDER BY wins DESC
  LIMIT 20
`;
console.log('=== TOP ATP 500 WINS ===');
results.forEach((r, i) => console.log(`${i+1}. ${r.winner_name}: ${r.wins} (${r.first_year}-${r.last_year})`));

const active = await prisma.$queryRaw`
  SELECT winner_name, COUNT(*)::int as wins
  FROM "Match"
  WHERE tourney_level = '500'
  GROUP BY winner_name
  HAVING MAX(year) >= 2023
  ORDER BY wins DESC
  LIMIT 10
`;
console.log('\n=== ACTIVE TOP 10 ===');
active.forEach((r,i) => console.log(`${i+1}. ${r.winner_name}: ${r.wins}`));

await prisma.$disconnect();
