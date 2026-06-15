import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Top 20 ATP 500 wins
const results = await prisma.$queryRaw`
  SELECT winner_name, winner_id, COUNT(*)::int as wins,
    MIN(year) as first_year, MAX(year) as last_year
  FROM "Match"
  WHERE tourney_level = 'A'
  GROUP BY winner_name, winner_id
  ORDER BY wins DESC
  LIMIT 20
`;
console.log('=== TOP ATP 500 WINS ===');
results.forEach((r, i) => console.log(`${i+1}. ${r.winner_name}: ${r.wins} (${r.first_year}-${r.last_year})`));

// Active players top 10
const active = await prisma.$queryRaw`
  SELECT winner_name, COUNT(*)::int as wins
  FROM "Match"
  WHERE tourney_level = 'A'
  GROUP BY winner_name
  HAVING MAX(year) >= 2023
  ORDER BY wins DESC
  LIMIT 10
`;
console.log('\n=== ACTIVE TOP 10 ===');
active.forEach((r,i) => console.log(`${i+1}. ${r.winner_name}: ${r.wins}`));

// Big names positions
const big = await prisma.$queryRaw`
  SELECT winner_name, COUNT(*)::int as wins,
    RANK() OVER (ORDER BY COUNT(*) DESC) as rnk
  FROM "Match"
  WHERE tourney_level = 'A'
  GROUP BY winner_name
  ORDER BY wins DESC
  LIMIT 50
`;
const names = ['Novak Djokovic','Roger Federer','Rafael Nadal','Andy Murray','Jimmy Connors'];
big.forEach(r => { if(names.includes(r.winner_name)) console.log(`${r.rnk}. ${r.winner_name}: ${r.wins}`); });

await prisma.$disconnect();
