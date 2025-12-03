DROP MATERIALIZED VIEW IF EXISTS mv_same_season_rounds;

CREATE MATERIALIZED VIEW mv_same_season_rounds AS
WITH surface_json AS (
    SELECT
        year,
        player_id::text,
        jsonb_object_agg(COALESCE(surface, 'Unknown'), cnt) AS surface_totals
    FROM (
        SELECT year, winner_id::text AS player_id, surface, COUNT(*) AS cnt
        FROM "Match"
        WHERE status = true
        GROUP BY year, winner_id, surface
        UNION ALL
        SELECT year, loser_id::text AS player_id, surface, COUNT(*) AS cnt
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
        jsonb_object_agg(COALESCE(tourney_level, 'Unknown'), cnt) AS level_totals
    FROM (
        SELECT year, winner_id::text AS player_id, tourney_level, COUNT(*) AS cnt
        FROM "Match"
        WHERE status = true
        GROUP BY year, winner_id, tourney_level
        UNION ALL
        SELECT year, loser_id::text AS player_id, tourney_level, COUNT(*) AS cnt
        FROM "Match"
        WHERE status = true
        GROUP BY year, loser_id, tourney_level
    ) sub
    GROUP BY year, player_id
),
round_json AS (
    SELECT
        year,
        player_id::text,
        jsonb_object_agg(COALESCE(round, 'Unknown'), cnt) AS round_totals
    FROM (
        SELECT year, winner_id::text AS player_id, round, COUNT(*) AS cnt
        FROM "Match"
        WHERE status = true
        GROUP BY year, winner_id, round
        UNION ALL
        SELECT year, loser_id::text AS player_id, round, COUNT(*) AS cnt
        FROM "Match"
        WHERE status = true
        GROUP BY year, loser_id, round
    ) sub
    GROUP BY year, player_id
),
total_rounds AS (
    SELECT
        player_id::text,
        year,
        COUNT(*) AS total_rounds
    FROM (
        SELECT year, winner_id::text AS player_id FROM "Match" WHERE status = true
        UNION ALL
        SELECT year, loser_id::text AS player_id FROM "Match" WHERE status = true
    ) sub
    GROUP BY year, player_id
)
SELECT
    tr.year,
    tr.player_id,
    tr.total_rounds,
    sj.surface_totals,
    lj.level_totals,
    rj.round_totals
FROM total_rounds tr
LEFT JOIN surface_json sj ON sj.year = tr.year AND sj.player_id = tr.player_id
LEFT JOIN level_json lj ON lj.year = tr.year AND lj.player_id = tr.player_id
LEFT JOIN round_json rj ON rj.year = tr.year AND rj.player_id = tr.player_id
ORDER BY tr.year DESC, tr.total_rounds DESC, tr.player_id;
