DROP MATERIALIZED VIEW IF EXISTS mv_ages_entries;

CREATE MATERIALIZED VIEW mv_ages_entries AS

WITH base AS (
    -- Consolidate winner/loser rows then select a single participation per (player_id, event_id)
    SELECT DISTINCT ON (player_id, event_id)
        player_id,
        age,
        surface,
        tourney_level,
        event_id
    FROM (
        SELECT m.event_id,
               m.winner_id   AS player_id,
               ROUND(m.winner_age::numeric, 3) AS age,
               COALESCE(m.surface, 'Unknown') AS surface,
               COALESCE(m.tourney_level, 'Unknown') AS tourney_level
        FROM "Match" m
        WHERE m.winner_age IS NOT NULL

        UNION ALL

        SELECT m.event_id,
               m.loser_id    AS player_id,
               ROUND(m.loser_age::numeric, 3) AS age,
               COALESCE(m.surface, 'Unknown') AS surface,
               COALESCE(m.tourney_level, 'Unknown') AS tourney_level
        FROM "Match" m
        WHERE m.loser_age IS NOT NULL
    ) combined
    WHERE player_id IS NOT NULL
    -- choose the earliest age for that player/event
    ORDER BY player_id, event_id, age
),

counts AS (
    SELECT
        player_id,
        age,
        COUNT(*) AS participations_at_age
    FROM base
    GROUP BY player_id, age
),

-- cumulative per player (sommatoria dei partecipations_at_age ordinata per età)
progressive AS (
    SELECT
        player_id,
        age,
        SUM(participations_at_age) OVER (PARTITION BY player_id ORDER BY age ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_participations
    FROM counts
),

agg_total AS (
    SELECT
        player_id,
        jsonb_object_agg(age::text, cumulative_participations ORDER BY age) AS ages_json
    FROM progressive
    GROUP BY player_id
),

-- counts e cumulativi per superficie
counts_surface AS (
    SELECT
        player_id,
        surface,
        age,
        COUNT(*) AS participations_at_age
    FROM base
    GROUP BY player_id, surface, age
),

progressive_surface AS (
    SELECT
        player_id,
        surface,
        age,
        SUM(participations_at_age) OVER (PARTITION BY player_id, surface ORDER BY age ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_participations
    FROM counts_surface
),

agg_surface AS (
    SELECT
        player_id,
        jsonb_object_agg(surface, surface_json) AS ages_by_surface_json
    FROM (
        SELECT
            player_id,
            surface,
            jsonb_object_agg(age::text, cumulative_participations ORDER BY age) AS surface_json
        FROM progressive_surface
        GROUP BY player_id, surface
    ) y
    GROUP BY player_id
),

-- counts e cumulativi per livello torneo
counts_level AS (
    SELECT
        player_id,
        tourney_level,
        age,
        COUNT(*) AS participations_at_age
    FROM base
    GROUP BY player_id, tourney_level, age
),

progressive_level AS (
    SELECT
        player_id,
        tourney_level,
        age,
        SUM(participations_at_age) OVER (PARTITION BY player_id, tourney_level ORDER BY age ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_participations
    FROM counts_level
),

agg_level AS (
    SELECT
        player_id,
        jsonb_object_agg(tourney_level, level_json) AS ages_by_level_json
    FROM (
        SELECT
            player_id,
            tourney_level,
            jsonb_object_agg(age::text, cumulative_participations ORDER BY age) AS level_json
        FROM progressive_level
        GROUP BY player_id, tourney_level
    ) y
    GROUP BY player_id
)

SELECT
    a.player_id,
    a.ages_json,
    s.ages_by_surface_json,
    l.ages_by_level_json
FROM agg_total a
LEFT JOIN agg_surface s ON s.player_id = a.player_id
LEFT JOIN agg_level l ON l.player_id = a.player_id;
