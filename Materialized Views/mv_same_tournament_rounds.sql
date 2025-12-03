DROP MATERIALIZED VIEW IF EXISTS mv_same_tournament_rounds;

CREATE MATERIALIZED VIEW mv_same_tournament_rounds AS
WITH unified AS (
    -- Unisco vincitori e perdenti in un'unica CTE
    SELECT
        tourney_id::text,
        tourney_name,
        COALESCE(surface, 'Unknown') AS surface,
        COALESCE(tourney_level, 'Unknown') AS tourney_level,
        COALESCE(round, 'Unknown') AS round,
        winner_id::text AS player_id
    FROM "Match"
    WHERE status = true
    UNION ALL
    SELECT
        tourney_id::text,
        tourney_name,
        COALESCE(surface, 'Unknown') AS surface,
        COALESCE(tourney_level, 'Unknown') AS tourney_level,
        COALESCE(round, 'Unknown') AS round,
        loser_id::text AS player_id
    FROM "Match"
    WHERE status = true
),
surface_json AS (
    SELECT
        tourney_id,
        player_id,
        jsonb_object_agg(surface, cnt) AS surface_totals
    FROM (
        SELECT
            tourney_id,
            player_id,
            surface,
            COUNT(*) AS cnt
        FROM unified
        GROUP BY tourney_id, player_id, surface
    ) sub
    GROUP BY tourney_id, player_id
),
level_json AS (
    SELECT
        tourney_id,
        player_id,
        jsonb_object_agg(tourney_level, cnt) AS level_totals
    FROM (
        SELECT
            tourney_id,
            player_id,
            tourney_level,
            COUNT(*) AS cnt
        FROM unified
        GROUP BY tourney_id, player_id, tourney_level
    ) sub
    GROUP BY tourney_id, player_id
),
round_json AS (
    SELECT
        tourney_id,
        player_id,
        jsonb_object_agg(round, cnt) AS round_totals
    FROM (
        SELECT
            tourney_id,
            player_id,
            round,
            COUNT(*) AS cnt
        FROM unified
        GROUP BY tourney_id, player_id, round
    ) sub
    GROUP BY tourney_id, player_id
),
total_rounds AS (
    SELECT
        player_id,
        tourney_id,
        COUNT(*) AS total_rounds,
        MAX(tourney_name) AS tourney_name
    FROM unified
    GROUP BY player_id, tourney_id
)
SELECT
    tr.tourney_id,
    tr.tourney_name,
    tr.player_id,
    tr.total_rounds,
    sj.surface_totals,
    lj.level_totals,
    rj.round_totals
FROM total_rounds tr
LEFT JOIN surface_json sj
    ON sj.tourney_id = tr.tourney_id AND sj.player_id = tr.player_id
LEFT JOIN level_json lj
    ON lj.tourney_id = tr.tourney_id AND lj.player_id = tr.player_id
LEFT JOIN round_json rj
    ON rj.tourney_id = tr.tourney_id AND rj.player_id = tr.player_id
ORDER BY tr.tourney_name, tr.total_rounds DESC, tr.player_id;
