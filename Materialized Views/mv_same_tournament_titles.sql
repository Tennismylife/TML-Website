DROP MATERIALIZED VIEW IF EXISTS mv_same_tournament_titles;

CREATE MATERIALIZED VIEW mv_same_tournament_titles AS
WITH surface_json AS (
    SELECT
        tourney_id::text AS tourney_id,
        player_id,
        jsonb_object_agg(COALESCE(surface, 'Unknown'), cnt) AS surface_titles
    FROM (
        SELECT
            tourney_id::text AS tourney_id,
            player_id,
            surface,
            COUNT(DISTINCT event_id) AS cnt
        FROM "PlayerTournament"
        WHERE round = 'W'
        GROUP BY tourney_id, player_id, surface
    ) sub
    GROUP BY tourney_id, player_id
),
level_json AS (
    SELECT
        tourney_id::text AS tourney_id,
        player_id,
        jsonb_object_agg(COALESCE(tourney_level, 'Unknown'), cnt) AS level_titles
    FROM (
        SELECT
            tourney_id::text AS tourney_id,
            player_id,
            tourney_level,
            COUNT(DISTINCT event_id) AS cnt
        FROM "PlayerTournament"
        WHERE round = 'W'
        GROUP BY tourney_id, player_id, tourney_level
    ) sub
    GROUP BY tourney_id, player_id
),
total_titles AS (
    SELECT
        tourney_id::text AS tourney_id,
        player_id,
        COUNT(DISTINCT event_id) AS total_titles,
        MAX(tourney_name) AS tourney_name
    FROM "PlayerTournament"
    WHERE round = 'W'
    GROUP BY tourney_id, player_id
)
SELECT
    tt.tourney_id,
    tt.tourney_name,
    tt.player_id,
    tt.total_titles,
    sj.surface_titles,
    lj.level_titles
FROM total_titles tt
LEFT JOIN surface_json sj ON sj.tourney_id = tt.tourney_id AND sj.player_id = tt.player_id
LEFT JOIN level_json lj ON lj.tourney_id = tt.tourney_id AND lj.player_id = tt.player_id
ORDER BY tt.tourney_name, tt.player_id;
