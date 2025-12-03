DROP MATERIALIZED VIEW IF EXISTS mv_same_tournament_wins;

CREATE MATERIALIZED VIEW mv_same_tournament_wins AS
WITH unique_wins AS (
    SELECT
        tourney_id,
        tourney_name,
        winner_id AS player_id,
        winner_name AS player_name,
        surface,
        tourney_level,
        best_of,
        round
    FROM "Match"
    WHERE status = TRUE
)
SELECT
    uw.tourney_id,
    uw.tourney_name,
    uw.player_id,
    uw.player_name,
    COUNT(*) AS total_wins,
    jsonb_object_agg(COALESCE(surface, 'Unknown'), cnt_surface) AS surface_totals,
    jsonb_object_agg(COALESCE(tourney_level, 'Unknown'), cnt_level) AS level_totals,
    jsonb_object_agg(COALESCE(best_of::text, 'Unknown'), cnt_best_of) AS best_of_totals,
    jsonb_object_agg(COALESCE(round, 'Unknown'), cnt_round) AS round_totals
FROM (
    SELECT
        tourney_id,
        tourney_name,
        player_id,
        player_name,
        surface,
        tourney_level,
        best_of,
        round,
        COUNT(*) OVER (PARTITION BY tourney_id, player_id, surface) AS cnt_surface,
        COUNT(*) OVER (PARTITION BY tourney_id, player_id, tourney_level) AS cnt_level,
        COUNT(*) OVER (PARTITION BY tourney_id, player_id, best_of) AS cnt_best_of,
        COUNT(*) OVER (PARTITION BY tourney_id, player_id, round) AS cnt_round
    FROM unique_wins
) uw
GROUP BY uw.tourney_id, uw.tourney_name, uw.player_id, uw.player_name
ORDER BY uw.tourney_name, uw.player_name;
