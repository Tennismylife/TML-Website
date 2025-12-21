#!/usr/bin/env bash
set -euo pipefail

# Example script to refresh all materialized views on Linux using psql.
# Configure environment variables: PGPASSWORD (or use .pgpass), PGUSER, PGDATABASE, PSQL

PGUSER=${PGUSER:-postgres}
PGDATABASE=${PGDATABASE:-tennis}
PSQL=${PSQL:-psql}

echo "Starting MV refresh on $PGDATABASE"
# Run each mv SQL and continue on error, printing diagnostics
run_sql(){
  local file="$1"
  echo "-- Executing: $file"
  if $PSQL -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" -f "$file"; then
    echo "-- OK: $file"
  else
    echo "-- FAILED: $file" >&2
  fi
}

run_sql "mv_top_winners.sql"
run_sql "mv_top_played.sql"
run_sql "mv_h2h_count.sql"
run_sql "mv_h2h_season.sql"
run_sql "mv_all_consecutive_win_streaks.sql"
run_sql "mv_entries.sql"
run_sql "mv_timespan_entries.sql"
run_sql "mv_same_tournament_wins.sql"
run_sql "mv_same_tournament_played.sql"
run_sql "mv_same_tournament_entries.sql"
run_sql "mv_same_tournament_titles.sql"
run_sql "mv_same_tournament_rounds.sql"
run_sql "mv_same_season_wins.sql"
run_sql "mv_same_season_played.sql"
run_sql "mv_same_season_entries.sql"
run_sql "mv_same_season_titles.sql"
run_sql "mv_all_entries.sql"
run_sql "mv_ages_played.sql"
run_sql "mv_ages_wins.sql"

echo "MV refresh script finished"
