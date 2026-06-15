import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const players = ['Roger Federer','Rafael Nadal','David Ferrer','Novak Djokovic','Alexander Zverev','Andy Murray','Feliciano Lopez','Andrey Rublev'];
const results = await prisma.player.findMany({
  where: { player: { in: players } },
  select: { player: true, slug: true, ioc: true }
});
results.forEach(r => console.log(`${r.player}: slug="${r.slug}" ioc="${r.ioc}"`));

await prisma.$disconnect();
