@echo off
set PGPASSWORD=postgres
set PSQL="C:\Program Files\PostgreSQL\18\bin\psql.exe"

%PSQL% -U postgres -d tennis -f "mv_top_winners.sql"
%PSQL% -U postgres -d tennis -f "mv_top_played.sql"
%PSQL% -U postgres -d tennis -f "mv_h2h_count.sql"
%PSQL% -U postgres -d tennis -f "mv_h2h_season.sql"
%PSQL% -U postgres -d tennis -f "mv_all_consecutive_win_streaks.sql"
%PSQL% -U postgres -d tennis -f "mv_entries.sql"
%PSQL% -U postgres -d tennis -f "mv_timespan_entries.sql"
%PSQL% -U postgres -d tennis -f "mv_same_tournament_wins.sql"
%PSQL% -U postgres -d tennis -f "mv_same_tournament_played.sql"
%PSQL% -U postgres -d tennis -f "mv_same_tournament_entries.sql"
%PSQL% -U postgres -d tennis -f "mv_same_tournament_titles.sql"
%PSQL% -U postgres -d tennis -f "mv_same_tournament_rounds.sql"
%PSQL% -U postgres -d tennis -f "mv_same_season_wins.sql"
%PSQL% -U postgres -d tennis -f "mv_same_season_played.sql"
%PSQL% -U postgres -d tennis -f "mv_same_season_entries.sql"
%PSQL% -U postgres -d tennis -f "mv_same_season_titles.sql"
%PSQL% -U postgres -d tennis -f "mv_total_entries.sql"

set PGPASSWORD=
