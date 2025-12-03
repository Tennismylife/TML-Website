psql -U postgres -d tennis -f "C:\Users\andre\OneDrive - Università degli Studi di Catania\Documents\GitHub\TennisMyLife Website\Materialized Views\mv_top_winners.sql"

psql -U postgres -d tennis -f "C:\Users\andre\OneDrive - Università degli Studi di Catania\Documents\GitHub\TennisMyLife Website\Materialized Views\mv_top_played.sql"

psql -U postgres -d tennis -f "C:\Users\andre\OneDrive - Università degli Studi di Catania\Documents\GitHub\TennisMyLife Website\Materialized Views\mv_h2h_count.sql"

psql -U postgres -d tennis -f "C:\Users\andre\OneDrive - Università degli Studi di Catania\Documents\GitHub\TennisMyLife Website\Materialized Views\mv_h2h_season.sql"

psql -U postgres -d tennis -f "C:\Users\andre\OneDrive - Università degli Studi di Catania\Documents\GitHub\TennisMyLife Website\Materialized Views\mv_all_consecutive_win_streaks.sql"

psql -U postgres -d tennis -f "C:\Users\andre\OneDrive - Università degli Studi di Catania\Documents\GitHub\TennisMyLife Website\Materialized Views\mv_entries.sql"

psql -U postgres -d tennis -f "C:\Users\andre\OneDrive - Università degli Studi di Catania\Documents\GitHub\TennisMyLife Website\Materialized Views\mv_timespan_entries.sql"

psql -U postgres -d tennis -f "C:\Users\andre\OneDrive - Università degli Studi di Catania\Documents\GitHub\TennisMyLife Website\Materialized Views\mv_same_tournament_wins.sql"

psql -U postgres -d tennis -f "C:\Users\andre\OneDrive - Università degli Studi di Catania\Documents\GitHub\TennisMyLife Website\Materialized Views\mv_same_tournament_played.sql"

psql -U postgres -d tennis -f "C:\Users\andre\OneDrive - Università degli Studi di Catania\Documents\GitHub\TennisMyLife Website\Materialized Views\mv_same_tournament_entries.sql"

psql -U postgres -d tennis -c "SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;"


npx prisma generate