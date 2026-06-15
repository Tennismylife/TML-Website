import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Big 3 positions
const big3 = await prisma.$queryRaw`
  SELECT winner_name, COUNT(*)::int as wins,
    RANK() OVER (ORDER BY COUNT(*) DESC) as rnk
  FROM "Match"
  WHERE tourney_level = '250'
  GROUP BY winner_name
  ORDER BY wins DESC
  LIMIT 50
`;
const names = ['Novak Djokovic','Roger Federer','Rafael Nadal','Andy Murray'];
big3.forEach(r => {
  if(names.includes(r.winner_name)) console.log(`${r.rnk}. ${r.winner_name}: ${r.wins}`);
});

// Muster total wins (for context)
const musterDetails = await prisma.$queryRaw`
  SELECT COUNT(*)::int as wins, MIN(year) as first, MAX(year) as last
  FROM "Match"
  WHERE tourney_level = '250' AND winner_name = 'Thomas Muster'
`;
console.log('Muster detail:', musterDetails[0]);

// Gasquet active years
const gasquetDetail = await prisma.$queryRaw`
  SELECT COUNT(*)::int as wins, MIN(year) as first, MAX(year) as last
  FROM "Match"
  WHERE tourney_level = '250' AND winner_name = 'Richard Gasquet'
`;
console.log('Gasquet detail:', gasquetDetail[0]);

// Active players in top 30 (still playing 2023+)
const active = await prisma.$queryRaw`
  SELECT winner_name, COUNT(*)::int as wins
  FROM "Match"
  WHERE tourney_level = '250'
  GROUP BY winner_name
  HAVING MAX(year) >= 2023
  ORDER BY wins DESC
  LIMIT 10
`;
console.log('\n=== ACTIVE PLAYERS TOP 10 ===');
active.forEach((r,i) => console.log(`${i+1}. ${r.winner_name}: ${r.wins}`));

await prisma.$disconnect();
