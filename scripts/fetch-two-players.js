(async () => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    async function fetchByName(name) {
      const p = await prisma.player.findFirst({
        where: { atpname: { equals: name, mode: 'insensitive' } },
        select: {
          id: true,
          player: true,
          atpname: true,
          slug: true,
          birthdate: true,
          height: true,
          weight: true,
          turnedpro: true,
          birthplace: true,
          coaches: true,
          hand: true,
          backhand: true,
          ioc: true,
          // if you have updatedAt or similar, add it
          updatedAt: true,
        },
      });
      return p;
    }

    const names = ['Roger Federer', 'Rafael Nadal'];
    for (const name of names) {
      try {
        const p = await fetchByName(name);
        console.log('---');
        console.log(`Player: ${name}`);
        if (!p) {
          console.log('Not found');
        } else {
          console.log(JSON.stringify(p, null, 2));
        }
      } catch (err) {
        console.error('Error fetching', name, err && err.message ? err.message : err);
      }
    }
  } catch (e) {
    console.error('Fatal error:', e && e.message ? e.message : e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
