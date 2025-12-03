DROP MATERIALIZED VIEW IF EXISTS mv_same_tournament_entries;

CREATE MATERIALIZED VIEW mv_same_tournament_entries AS
WITH surface_json AS (
    SELECT
        tourney_id::text AS tourney_id,
        player_id,
        jsonb_object_agg(COALESCE(surface, 'Unknown'), cnt) AS surface_totals
    FROM (
        SELECT
            tourney_id::text AS tourney_id,
            player_id,
            surface,
            COUNT(DISTINCT event_id) AS cnt
        FROM "PlayerTournament"
        GROUP BY tourney_id, player_id, surface
    ) sub
    GROUP BY tourney_id, player_id
),
level_json AS (
    SELECT
        tourney_id::text AS tourney_id,
        player_id,
        jsonb_object_agg(COALESCE(tourney_level, 'Unknown'), cnt) AS level_totals
    FROM (
        SELECT
            tourney_id::text AS tourney_id,
            player_id,
            tourney_level,
            COUNT(DISTINCT event_id) AS cnt
        FROM "PlayerTournament"
        GROUP BY tourney_id, player_id, tourney_level
    ) sub
    GROUP BY tourney_id, player_id
),
total_entries AS (
    SELECT
        tourney_id::text AS tourney_id,
        player_id,
        COUNT(DISTINCT event_id) AS total_entries,
        MAX(tourney_name) AS tourney_name
    FROM "PlayerTournament"
    GROUP BY tourney_id, player_id
)
SELECT
    te.tourney_id,
    te.tourney_name,
    te.player_id,
    te.total_entries,
    sj.surface_totals,
    lj.level_totals
FROM total_entries te
LEFT JOIN surface_json sj ON sj.tourney_id = te.tourney_id AND sj.player_id = te.player_id
LEFT JOIN level_json lj ON lj.tourney_id = te.tourney_id AND lj.player_id = te.player_id
ORDER BY te.tourney_name, te.player_id;
