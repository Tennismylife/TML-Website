DROP MATERIALIZED VIEW IF EXISTS mv_same_season_wins;

CREATE MATERIALIZED VIEW mv_same_season_wins AS
WITH surface_json AS (
    SELECT
        year,
        winner_id AS player_id,
        jsonb_object_agg(COALESCE(surface, 'Unknown'), cnt) AS surface_wins
    FROM (
        SELECT
            year,
            winner_id,
            surface,
            COUNT(*) AS cnt
        FROM "Match"
        WHERE status = true
        GROUP BY year, winner_id, surface
    ) sub
    GROUP BY year, winner_id
),
level_json AS (
    SELECT
        year,
        winner_id AS player_id,
        jsonb_object_agg(COALESCE(tourney_level, 'Unknown'), cnt) AS level_wins
    FROM (
        SELECT
            year,
            winner_id,
            tourney_level,
            COUNT(*) AS cnt
        FROM "Match"
        WHERE status = true
        GROUP BY year, winner_id, tourney_level
    ) sub
    GROUP BY year, winner_id
),
best_of_json AS (
    SELECT
        year,
        winner_id AS player_id,
        jsonb_object_agg(COALESCE(best_of::text, 'Unknown'), cnt) AS best_of_wins
    FROM (
        SELECT
            year,
            winner_id,
            best_of,
            COUNT(*) AS cnt
        FROM "Match"
        WHERE status = true
        GROUP BY year, winner_id, best_of
    ) sub
    GROUP BY year, winner_id
),
round_json AS (
    SELECT
        year,
        winner_id AS player_id,
        jsonb_object_agg(COALESCE(round, 'Unknown'), cnt) AS round_wins
    FROM (
        SELECT
            year,
            winner_id,
            round,
            COUNT(*) AS cnt
        FROM "Match"
        WHERE status = true
        GROUP BY year, winner_id, round
    ) sub
    GROUP BY year, winner_id
),
total_wins AS (
    SELECT
        year,
        winner_id AS player_id,
        COUNT(*) AS total_wins
    FROM "Match"
    WHERE status = true
    GROUP BY year, winner_id
)
SELECT
    tw.year,
    tw.player_id,
    tw.total_wins,
    sj.surface_wins,
    lj.level_wins,
    bj.best_of_wins,
    rj.round_wins
FROM total_wins tw
LEFT JOIN surface_json sj ON sj.year = tw.year AND sj.player_id = tw.player_id
LEFT JOIN level_json lj ON lj.year = tw.year AND lj.player_id = tw.player_id
LEFT JOIN best_of_json bj ON bj.year = tw.year AND bj.player_id = tw.player_id
LEFT JOIN round_json rj ON rj.year = tw.year AND rj.player_id = tw.player_id
ORDER BY tw.year DESC, tw.total_wins DESC, tw.player_id;
