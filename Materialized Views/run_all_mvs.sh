#!/usr/bin/env bash
set -euo pipefail

# Example script to refresh all materialized views on Linux using psql.
# Configure environment variables: PGPASSWORD (or use .pgpass), PGUSER, PGDATABASE, PSQL

PGUSER=${PGUSER:-postgres}
PGDATABASE=${PGDATABASE:-tennis}
PSQL=${PSQL:-psql}

echo "Starting MV refresh on $PGDATABASE"
$PSQL -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" -f "mv_top_winners.sql"
$PSQL -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" -f "mv_top_played.sql"
$PSQL -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" -f "mv_h2h_count.sql"
$PSQL -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" -f "mv_h2h_season.sql"
$PSQL -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" -f "mv_all_consecutive_win_streaks.sql"
$PSQL -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" -f "mv_entries.sql"
$PSQL -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" -f "mv_timespan_entries.sql"
$PSQL -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" -f "mv_same_tournament_wins.sql"
$PSQL -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" -f "mv_same_tournament_played.sql"
$PSQL -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" -f "mv_same_tournament_entries.sql"
$PSQL -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" -f "mv_same_tournament_titles.sql"
$PSQL -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" -f "mv_same_tournament_rounds.sql"
$PSQL -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" -f "mv_same_season_wins.sql"
$PSQL -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" -f "mv_same_season_played.sql"
$PSQL -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" -f "mv_same_season_entries.sql"
$PSQL -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" -f "mv_same_season_titles.sql"
$PSQL -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" -f "mv_total_entries.sql"

echo "MV refresh script finished"
