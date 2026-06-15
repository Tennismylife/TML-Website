import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const players = ['Thomas Muster','Richard Gasquet','Carlos Moya','Yevgeny Kafelnikov','Lleyton Hewitt','Gael Monfils','Roger Federer'];
const results = await prisma.player.findMany({
  where: { player: { in: players } },
  select: { player: true, slug: true, ioc: true }
});
results.forEach(r => console.log(`${r.player}: slug="${r.slug}" ioc="${r.ioc}"`));

await prisma.$disconnect();
