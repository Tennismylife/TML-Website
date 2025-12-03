DROP MATERIALIZED VIEW IF EXISTS mv_same_tournament_played;

CREATE MATERIALIZED VIEW mv_same_tournament_played AS
WITH unique_matches AS (
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
    WHERE status = TRUE AND team_event = FALSE

    UNION ALL

    SELECT
        tourney_id,
        tourney_name,
        loser_id AS player_id,
        loser_name AS player_name,
        surface,
        tourney_level,
        best_of,
        round
    FROM "Match"
    WHERE status = TRUE AND team_event = FALSE
)
SELECT
    um.tourney_id,
    um.tourney_name,
    um.player_id,
    um.player_name,
    COUNT(*) AS total_matches,
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
    FROM unique_matches
) um
GROUP BY um.tourney_id, um.tourney_name, um.player_id, um.player_name
ORDER BY um.tourney_name, um.player_name;
