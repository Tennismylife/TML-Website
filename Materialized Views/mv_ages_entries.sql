DROP MATERIALIZED VIEW IF EXISTS mv_ages_entries;

CREATE MATERIALIZED VIEW mv_ages_entries AS

WITH base AS (
    -- Winner: prima partita per torneo
    SELECT *
    FROM (
        SELECT DISTINCT ON (m.event_id, m.winner_id)
            m.winner_id AS player_id,
            ROUND(m.winner_age::numeric, 3) AS age,
            COALESCE(m.surface, 'Unknown') AS surface,
            COALESCE(m.tourney_level, 'Unknown') AS tourney_level
        FROM "Match" m
        WHERE m.winner_age IS NOT NULL
        ORDER BY m.event_id, m.winner_id, m.winner_age
    ) AS winners

    UNION ALL

    -- Loser: prima partita per torneo
    SELECT *
    FROM (
        SELECT DISTINCT ON (m.event_id, m.loser_id)
            m.loser_id AS player_id,
            ROUND(m.loser_age::numeric, 3) AS age,
            COALESCE(m.surface, 'Unknown') AS surface,
            COALESCE(m.tourney_level, 'Unknown') AS tourney_level
        FROM "Match" m
        WHERE m.loser_age IS NOT NULL
        ORDER BY m.event_id, m.loser_id, m.loser_age
    ) AS losers
),

counts AS (
    SELECT
        player_id,
        age,
        COUNT(*) AS participations_at_age
    FROM base
    GROUP BY player_id, age
),

progressive AS (
    SELECT
        player_id,
        age,
        ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY age) AS cumulative_participations
    FROM counts
),

agg_total AS (
    SELECT
        player_id,
        jsonb_object_agg(age::text, cumulative_participations ORDER BY age) AS ages_json
    FROM progressive
    GROUP BY player_id
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
        FROM (
            SELECT
                player_id,
                surface,
                age,
                ROW_NUMBER() OVER (PARTITION BY player_id, surface ORDER BY age) AS cumulative_participations
            FROM base
        ) x
        GROUP BY player_id, surface
    ) y
    GROUP BY player_id
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
        FROM (
            SELECT
                player_id,
                tourney_level,
                age,
                ROW_NUMBER() OVER (PARTITION BY player_id, tourney_level ORDER BY age) AS cumulative_participations
            FROM base
        ) x
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
