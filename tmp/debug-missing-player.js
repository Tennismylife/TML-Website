const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const slug = 'moise-kouame';
  const p = await prisma.player.findFirst({ where: { slug }, select: { id: true, atpname: true, slug: true } });
  console.log('player slug', p);
  const name = 'moise kouame';
  const p2 = await prisma.player.findFirst({ where: { atpname: { equals: name, mode: 'insensitive' } }, select: { id: true, atpname: true, slug: true } });
  console.log('player name', p2);
  const p3 = await prisma.player.findFirst({ where: { atpname: { contains: 'moise', mode: 'insensitive' } }, select: { id: true, atpname: true, slug: true } });
  console.log('contains moise', p3);
  await prisma.$disconnect();
})();