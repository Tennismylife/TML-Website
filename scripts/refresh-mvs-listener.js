#!/usr/bin/env node
/*
 * Listener for Postgres NOTIFY 'mvs_needs_refresh'
 * - Debounces multiple notifications into a single refresh
 * - By default runs REFRESH MATERIALIZED VIEW <name> for each configured MV (non-concurrent safe fallback)
 * - Can be run in "--once" mode to immediately refresh (useful for cron fallback)
 *
 * Usage:
 *   DATABASE_URL=... node scripts/refresh-mvs-listener.js        # long running listener
 *   DATABASE_URL=... node scripts/refresh-mvs-listener.js --once  # one-shot immediate refresh
 */

const postgres = require('postgres');

const MV_NAMES = [
  'mv_top_winners',
  'mv_top_played',
  'mv_h2h_count',
  'mv_h2h_season',
  'mv_all_consecutive_win_streaks',
  'mv_entries',
  'mv_timespan_entries',
  'mv_same_tournament_wins',
  'mv_same_tournament_played',
  'mv_same_tournament_entries',
  'mv_same_tournament_titles',
  'mv_same_tournament_rounds',
  'mv_same_season_wins',
  'mv_same_season_played',
  'mv_same_season_entries',
  'mv_same_season_titles',
  'mv_all_entries',
  'mv_stats',
  'mv_streak_rounds',
  'mv_ages_entries',
  'mv_ages_played',
  'mv_ages_wins'
];

const DEBOUNCE_MS = Number(process.env.MV_REFRESH_DEBOUNCE_MS) || 5000;

async function refreshAll(sql) {
  const refreshConcurrently = process.env.REFRESH_CONCURRENTLY === '1' || false;
  console.log(new Date().toISOString(), 'Refreshing materialized views...');
  const missing = [];
  for (const mv of MV_NAMES) {
    try {
      // Check if materialized view exists before attempting refresh
      const rows = await sql`SELECT to_regclass(${mv}) as reg`; // returns [{ reg: 'mv_name' }] or [{ reg: null }]
      const exists = rows && rows[0] && rows[0].reg;
      if (!exists) {
        console.warn('MV not found, skipping', mv);
        missing.push(mv);
        continue;
      }

      const cmd = refreshConcurrently ? `REFRESH MATERIALIZED VIEW CONCURRENTLY ${mv}` : `REFRESH MATERIALIZED VIEW ${mv}`;
      await sql.unsafe(cmd);
      console.log('Refreshed', mv);
    } catch (err) {
      console.error('Failed to refresh', mv, err.message || err);
    }
  }
  if (missing.length) {
    console.warn('Some materialized views were missing and skipped:', missing.join(', '));
  }
  console.log(new Date().toISOString(), 'Refresh complete');
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  const args = process.argv.slice(2);
  if (args.includes('--once')) {
    try {
      await refreshAll(sql);
    } finally {
      await sql.end();
      // In tests we avoid calling process.exit to allow the test runner to continue
      if (process.env.NODE_ENV === 'test') return;
      process.exit(0);
    }
  }

  let timer = null;
  let running = false;

  await sql.listen('mvs_needs_refresh', (payload) => {
    console.log(new Date().toISOString(), 'Received notification:', payload);
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      if (running) {
        console.log('Refresh already running, skipping this cycle');
        return;
      }
      running = true;
      try {
        await refreshAll(sql);
      } finally {
        running = false;
      }
    }, DEBOUNCE_MS);
  });

  console.log('Listening for mvs_needs_refresh notifications (debounce', DEBOUNCE_MS, 'ms).');

  // keep process alive
  process.stdin.resume();
}

module.exports = { refreshAll, main };

if (require.main === module) {
  main().catch((err) => {
    console.error('Listener failed', err);
    process.exit(1);
  });
}