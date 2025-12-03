DROP MATERIALIZED VIEW IF EXISTS mv_same_season_entries;

CREATE MATERIALIZED VIEW mv_same_season_entries AS
WITH surface_json AS (
    SELECT
        year,
        player_id::text,
        jsonb_object_agg(COALESCE(surface, 'Unknown'), cnt) AS surface_totals
    FROM (
        SELECT
            year,
            player_id::text,
            surface,
            COUNT(DISTINCT event_id) AS cnt
        FROM "PlayerTournament"
        GROUP BY year, player_id, surface
    ) sub
    GROUP BY year, player_id
),
level_json AS (
    SELECT
        year,
        player_id::text,
        jsonb_object_agg(COALESCE(tourney_level, 'Unknown'), cnt) AS level_totals
    FROM (
        SELECT
            year,
            player_id::text,
            tourney_level,
            COUNT(DISTINCT event_id) AS cnt
        FROM "PlayerTournament"
        GROUP BY year, player_id, tourney_level
    ) sub
    GROUP BY year, player_id
),
total_entries AS (
    SELECT
        year,
        player_id::text,
        COUNT(DISTINCT event_id) AS total_entries
    FROM "PlayerTournament"
    GROUP BY year, player_id
)
SELECT
    te.year,
    te.player_id,
    te.total_entries,
    sj.surface_totals,
    lj.level_totals
FROM total_entries te
LEFT JOIN surface_json sj ON sj.year = te.year AND sj.player_id = te.player_id
LEFT JOIN level_json lj ON lj.year = te.year AND lj.player_id = te.player_id
ORDER BY te.year DESC, te.total_entries DESC, te.player_id;
