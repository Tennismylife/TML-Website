DROP MATERIALIZED VIEW IF EXISTS mv_neededto;

CREATE MATERIALIZED VIEW mv_neededto AS
WITH unique_events AS (
    SELECT DISTINCT
        player_id,
        event_id,
        surface,
        tourney_level,
        MAX(CASE WHEN round = 'W' THEN 1 ELSE 0 END) AS is_title
    FROM "PlayerTournament"
    GROUP BY player_id, event_id, surface, tourney_level
),
overall_progress AS (
    SELECT
        t1.player_id,
        t1.event_id,
        t1.is_title,
        SUM(t2.is_title) AS title_number,
        COUNT(t2.event_id) AS num_played_overall
    FROM unique_events t1
    JOIN unique_events t2
      ON t1.player_id = t2.player_id
     AND t2.event_id <= t1.event_id
    WHERE t1.is_title = 1
    GROUP BY t1.player_id, t1.event_id, t1.is_title
),
surface_progress AS (
    SELECT
        t1.player_id,
        t1.surface,
        t1.event_id,
        t1.is_title,
        SUM(t2.is_title) AS title_number_surface,
        COUNT(t2.event_id) AS num_played_surface
    FROM unique_events t1
    JOIN unique_events t2
      ON t1.player_id = t2.player_id
     AND t1.surface = t2.surface
     AND t2.event_id <= t1.event_id
    WHERE t1.is_title = 1
    GROUP BY t1.player_id, t1.surface, t1.event_id, t1.is_title
),
level_progress AS (
    SELECT
        t1.player_id,
        t1.tourney_level,
        t1.event_id,
        t1.is_title,
        SUM(t2.is_title) AS title_number_level,
        COUNT(t2.event_id) AS num_played_level
    FROM unique_events t1
    JOIN unique_events t2
      ON t1.player_id = t2.player_id
     AND t1.tourney_level = t2.tourney_level
     AND t2.event_id <= t1.event_id
    WHERE t1.is_title = 1
    GROUP BY t1.player_id, t1.tourney_level, t1.event_id, t1.is_title
),
overall_json AS (
    SELECT
        player_id,
        jsonb_agg(jsonb_build_object(
            'titles', title_number,
            'played', num_played_overall
        ) ORDER BY title_number) AS overall_json
    FROM overall_progress
    GROUP BY player_id
),
surface_json AS (
    SELECT
        player_id,
        jsonb_object_agg(surface, steps_array) AS surface_json
    FROM (
        SELECT
            player_id,
            surface,
            array_agg(jsonb_build_object('titles', title_number_surface, 'played', num_played_surface) 
                      ORDER BY title_number_surface) AS steps_array
        FROM surface_progress
        GROUP BY player_id, surface
    ) sub
    GROUP BY player_id
),
level_json AS (
    SELECT
        player_id,
        jsonb_object_agg(tourney_level, steps_array) AS level_json
    FROM (
        SELECT
            player_id,
            tourney_level,
            array_agg(jsonb_build_object('titles', title_number_level, 'played', num_played_level)
                      ORDER BY title_number_level) AS steps_array
        FROM level_progress
        GROUP BY player_id, tourney_level
    ) sub
    GROUP BY player_id
)
SELECT
    o.player_id,
    o.overall_json,
    s.surface_json,
    l.level_json
FROM overall_json o
JOIN surface_json s USING (player_id)
JOIN level_json l USING (player_id)
ORDER BY o.player_id;
