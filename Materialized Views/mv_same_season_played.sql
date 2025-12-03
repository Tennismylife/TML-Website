DROP MATERIALIZED VIEW IF EXISTS mv_same_season_played;

CREATE MATERIALIZED VIEW mv_same_season_played AS
WITH surface_json AS (
    SELECT
        year,
        player_id::text,
        jsonb_object_agg(COALESCE(surface, 'Unknown'), cnt) AS surface_played
    FROM (
        SELECT
            year,
            winner_id::text AS player_id,
            surface,
            COUNT(*) AS cnt
        FROM "Match"
        WHERE status = true
        GROUP BY year, winner_id, surface

        UNION ALL

        SELECT
            year,
            loser_id::text AS player_id,
            surface,
            COUNT(*) AS cnt
        FROM "Match"
        WHERE status = true
        GROUP BY year, loser_id, surface
    ) sub
    GROUP BY year, player_id
),
level_json AS (
    SELECT
        year,
        player_id::text,
        jsonb_object_agg(COALESCE(tourney_level, 'Unknown'), cnt) AS level_played
    FROM (
        SELECT
            year,
            winner_id::text AS player_id,
            tourney_level,
            COUNT(*) AS cnt
        FROM "Match"
        WHERE status = true
        GROUP BY year, winner_id, tourney_level

        UNION ALL

        SELECT
            year,
            loser_id::text AS player_id,
            tourney_level,
            COUNT(*) AS cnt
        FROM "Match"
        WHERE status = true
        GROUP BY year, loser_id, tourney_level
    ) sub
    GROUP BY year, player_id
),
best_of_json AS (
    SELECT
        year,
        player_id::text,
        jsonb_object_agg(COALESCE(best_of::text, 'Unknown'), cnt) AS best_of_played
    FROM (
        SELECT
            year,
            winner_id::text AS player_id,
            best_of,
            COUNT(*) AS cnt
        FROM "Match"
        WHERE status = true
        GROUP BY year, winner_id, best_of

        UNION ALL

        SELECT
            year,
            loser_id::text AS player_id,
            best_of,
            COUNT(*) AS cnt
        FROM "Match"
        WHERE status = true
        GROUP BY year, loser_id, best_of
    ) sub
    GROUP BY year, player_id
),
round_json AS (
    SELECT
        year,
        player_id::text,
        jsonb_object_agg(COALESCE(round, 'Unknown'), cnt) AS round_played
    FROM (
        SELECT
            year,
            winner_id::text AS player_id,
            round,
            COUNT(*) AS cnt
        FROM "Match"
        WHERE status = true
        GROUP BY year, winner_id, round

        UNION ALL

        SELECT
            year,
            loser_id::text AS player_id,
            round,
            COUNT(*) AS cnt
        FROM "Match"
        WHERE status = true
        GROUP BY year, loser_id, round
    ) sub
    GROUP BY year, player_id
),
total_played AS (
    SELECT
        year,
        player_id::text,
        COUNT(*) AS total_played
    FROM (
        SELECT year, winner_id::text AS player_id FROM "Match" WHERE status = true
        UNION ALL
        SELECT year, loser_id::text AS player_id FROM "Match" WHERE status = true
    ) sub
    GROUP BY year, player_id
)
SELECT
    tp.year,
    tp.player_id,
    tp.total_played,
    sj.surface_played,
    lj.level_played,
    bj.best_of_played,
    rj.round_played
FROM total_played tp
LEFT JOIN surface_json sj ON sj.year = tp.year AND sj.player_id = tp.player_id
LEFT JOIN level_json lj ON lj.year = tp.year AND lj.player_id = tp.player_id
LEFT JOIN best_of_json bj ON bj.year = tp.year AND bj.player_id = tp.player_id
LEFT JOIN round_json rj ON rj.year = tp.year AND rj.player_id = tp.player_id
ORDER BY tp.year DESC, tp.total_played DESC, tp.player_id;
