(async () => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const p = await prisma.player.findFirst({ where: { atpname: 'Frances Tiafoe' } });
    console.log(JSON.stringify(p, null, 2));
  } catch (e) {
    console.error('Error', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
