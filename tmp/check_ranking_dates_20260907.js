require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  for (const s of ['2026-08-31T00:00:00.000Z','2026-09-07T00:00:00.000Z']) {
    const d = new Date(s);
    const rd = await p.rankingDate.findUnique({ where: { date: d }, include: { _count: { select: { rankings: true } } } });
    console.log(s.slice(0,10), rd ? `id=${rd.id} rows=${rd._count.rankings}` : 'MISSING');
  }
  const latest = await p.rankingDate.findMany({ orderBy: { date: 'desc' }, take: 5, include: { _count: { select: { rankings: true } } } });
  console.log('LATEST');
  for (const x of latest) console.log(x.date.toISOString().slice(0,10), `id=${x.id}`, `rows=${x._count.rankings}`);
})().catch(e => { console.error('ERR', e.message); process.exitCode = 1; }).finally(async () => { await p.$disconnect(); });