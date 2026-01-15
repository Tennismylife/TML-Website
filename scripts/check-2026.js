#!/usr/bin/env node
const postgres = require('postgres');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Please set DATABASE_URL and re-run: DATABASE_URL=... node scripts/check-2026.js');
    process.exit(1);
  }
  const sql = postgres(url, { max: 1 });
  try {
    const total = await sql`SELECT count(*)::int AS cnt FROM "Match" WHERE year = 2026`;
    const withStats = await sql`SELECT count(*)::int AS cnt FROM "Match" WHERE year = 2026 AND w_1stIn IS NOT NULL AND l_1stIn IS NOT NULL AND w_ace IS NOT NULL`;
    const mvStats = await sql`SELECT count(*)::int AS cnt FROM mv_stats WHERE year = 2026`;
    const mvStatsWithStatsTrue = await sql`SELECT count(*)::int AS cnt FROM mv_stats WHERE year = 2026 AND stats = true`;

    console.log('Matches with year=2026:', total[0].cnt);
    console.log('Matches with completed stats (non-null fields):', withStats[0].cnt);
    console.log('Rows in mv_stats for 2026:', mvStats[0].cnt);
    console.log('Rows in mv_stats for 2026 with stats=true:', mvStatsWithStatsTrue[0].cnt);
  } catch (err) {
    console.error('Query failed', err.message || err);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});