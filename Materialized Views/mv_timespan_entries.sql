-- 1) Drop & Create
DROP MATERIALIZED VIEW IF EXISTS mv_timespan_entries;

CREATE MATERIALIZED VIEW mv_timespan_entries AS
WITH base AS (
    SELECT
        player_id,
        surface,
        tourney_level,
        tourney_id,          -- chiave univoca dell’edizione
        tourney_name,
        tourney_date::date AS d
        -- Se tourney_date è timestamptz e vuoi normalizzare in UTC:
        -- date(timezone('UTC', tourney_date)) AS d
    FROM "PlayerTournament"
),

-- FIRST/LAST overall (deterministico su d e poi tourney_id)
first_overall AS (
    SELECT DISTINCT ON (player_id)
           player_id,
           d  AS first_date,
           tourney_id   AS first_tourney_id,
           tourney_name AS first_tourney_name
    FROM base
    ORDER BY player_id, d ASC, tourney_id ASC
),
last_overall AS (
    SELECT DISTINCT ON (player_id)
           player_id,
           d  AS last_date,
           tourney_id   AS last_tourney_id,
           tourney_name AS last_tourney_name
    FROM base
    ORDER BY player_id, d DESC, tourney_id DESC
),
overall AS (
    SELECT f.player_id,
           f.first_date,
           l.last_date,
           (l.last_date - f.first_date)::int AS days_between_overall,
           f.first_tourney_id,   f.first_tourney_name,
           l.last_tourney_id,    l.last_tourney_name
    FROM first_overall f
    JOIN last_overall  l USING (player_id)
),

-- FIRST/LAST per surface
first_surface AS (
    SELECT DISTINCT ON (player_id, surface)
           player_id, surface,
           d AS first_date,
           tourney_id   AS first_tourney_id,
           tourney_name AS first_tourney_name
    FROM base
    WHERE surface IS NOT NULL
    ORDER BY player_id, surface, d ASC, tourney_id ASC
),
last_surface AS (
    SELECT DISTINCT ON (player_id, surface)
           player_id, surface,
           d AS last_date,
           tourney_id   AS last_tourney_id,
           tourney_name AS last_tourney_name
    FROM base
    WHERE surface IS NOT NULL
    ORDER BY player_id, surface, d DESC, tourney_id DESC
),
surface_span AS (
    SELECT
        f.player_id,
        f.surface,
        f.first_date, l.last_date,
        (l.last_date - f.first_date)::int AS days_between,
        f.first_tourney_id,   f.first_tourney_name,
        l.last_tourney_id,    l.last_tourney_name
    FROM first_surface f
    JOIN last_surface  l USING (player_id, surface)
),

-- FIRST/LAST per level
first_level AS (
    SELECT DISTINCT ON (player_id, tourney_level)
           player_id, tourney_level,
           d AS first_date,
           tourney_id   AS first_tourney_id,
           tourney_name AS first_tourney_name
    FROM base
    WHERE tourney_level IS NOT NULL
    ORDER BY player_id, tourney_level, d ASC, tourney_id ASC
),
last_level AS (
    SELECT DISTINCT ON (player_id, tourney_level)
           player_id, tourney_level,
           d AS last_date,
           tourney_id   AS last_tourney_id,
           tourney_name AS last_tourney_name
    FROM base
    WHERE tourney_level IS NOT NULL
    ORDER BY player_id, tourney_level, d DESC, tourney_id DESC
),
level_span AS (
    SELECT
        f.player_id,
        f.tourney_level,
        f.first_date, l.last_date,
        (l.last_date - f.first_date)::int AS days_between,
        f.first_tourney_id,   f.first_tourney_name,
        l.last_tourney_id,    l.last_tourney_name
    FROM first_level f
    JOIN last_level  l USING (player_id, tourney_level)
),

-- JSON aggregati (pre-aggregati per evitare join moltiplicativi)
surface_json AS (
    SELECT
        player_id,
        jsonb_agg(
            jsonb_build_object(
                'surface', surface,
                'first_tourney_id',   first_tourney_id,
                'first_tourney_name', first_tourney_name,
                'first_tourney_date', first_date,
                'last_tourney_id',    last_tourney_id,
                'last_tourney_name',  last_tourney_name,
                'last_tourney_date',  last_date,
                'days_between',       days_between
            )
            ORDER BY days_between DESC
        ) AS surface_timespan
    FROM surface_span
    GROUP BY player_id
),
level_json AS (
    SELECT
        player_id,
        jsonb_agg(
            jsonb_build_object(
                'level',              tourney_level,
                'first_tourney_id',   first_tourney_id,
                'first_tourney_name', first_tourney_name,
                'first_tourney_date', first_date,
                'last_tourney_id',    last_tourney_id,
                'last_tourney_name',  last_tourney_name,
                'last_tourney_date',  last_date,
                'days_between',       days_between
            )
            ORDER BY days_between DESC
        ) AS level_timespan
    FROM level_span
    GROUP BY player_id
)

SELECT
    o.player_id,
    sj.surface_timespan,
    lj.level_timespan,
    jsonb_build_object(
        'first_tourney_id',   o.first_tourney_id,
        'first_tourney_name', o.first_tourney_name,
        'first_tourney_date', o.first_date,
        'last_tourney_id',    o.last_tourney_id,
        'last_tourney_name',  o.last_tourney_name,
        'last_tourney_date',  o.last_date,
        'days_between',       o.days_between_overall
    ) AS overall_timespan,
    o.days_between_overall
FROM overall o
LEFT JOIN surface_json sj USING (player_id)
LEFT JOIN level_json   lj USING (player_id);