const { prisma } = require('../lib/prisma');
(async () => {
  try {
    const cols = await prisma.$queryRaw`select column_name from information_schema.columns where table_name='Ranking';`;
    console.log(cols);
  } catch (e) {
    console.error(e);
  }
  await prisma.$disconnect();
})();
