DROP MATERIALIZED VIEW IF EXISTS mv_played_ages;

CREATE MATERIALIZED VIEW mv_played_ages AS
WITH base AS (
  SELECT
    m.id,  -- aggiunto per ROW_NUMBER
    m.winner_id AS player_id,
    ROUND(m.winner_age::numeric, 3) AS age,
    COALESCE(m.surface, 'Unknown') AS surface,
    COALESCE(m.tourney_level, 'Unknown') AS tourney_level,
    COALESCE(m.round, 'Unknown') AS round,
    COALESCE(m.best_of::text, 'Unknown') AS best_of
  FROM "Match" m
  WHERE m.status = TRUE AND m.winner_age IS NOT NULL

  UNION ALL

  SELECT
    m.id,
    m.loser_id AS player_id,
    ROUND(m.loser_age::numeric, 3) AS age,
    COALESCE(m.surface, 'Unknown') AS surface,
    COALESCE(m.tourney_level, 'Unknown') AS tourney_level,
    COALESCE(m.round, 'Unknown') AS round,
    COALESCE(m.best_of::text, 'Unknown') AS best_of
  FROM "Match" m
  WHERE m.status = TRUE AND m.loser_age IS NOT NULL
),

ordered AS (
  SELECT
    player_id,
    age,
    surface,
    tourney_level,
    round,
    best_of,
    ROW_NUMBER() OVER (
      PARTITION BY player_id
      ORDER BY id
    ) AS match_number
  FROM base
),

-- 1. JSON totale
agg_total AS (
  SELECT
    player_id,
    jsonb_object_agg(match_number::text, age ORDER BY match_number) AS ages_json
  FROM ordered
  GROUP BY player_id
),

-- 2. JSON per superficie
agg_surface AS (
  SELECT
    player_id,
    jsonb_object_agg(surface, surface_json) AS ages_by_surface_json
  FROM (
    SELECT
      player_id,
      surface,
      jsonb_object_agg(match_number_surface::text, age ORDER BY match_number_surface) AS surface_json
    FROM (
      SELECT
        player_id,
        surface,
        age,
        ROW_NUMBER() OVER (PARTITION BY player_id, surface ORDER BY id) AS match_number_surface
      FROM base
    ) y
    GROUP BY player_id, surface
  ) x
  GROUP BY player_id
),

-- 3. JSON per livello torneo
agg_level AS (
  SELECT
    player_id,
    jsonb_object_agg(tourney_level, level_json) AS ages_by_level_json
  FROM (
    SELECT
      player_id,
      tourney_level,
      jsonb_object_agg(match_number_level::text, age ORDER BY match_number_level) AS level_json
    FROM (
      SELECT
        player_id,
        tourney_level,
        age,
        ROW_NUMBER() OVER (PARTITION BY player_id, tourney_level ORDER BY id) AS match_number_level
      FROM base
    ) y
    GROUP BY player_id, tourney_level
  ) x
  GROUP BY player_id
),

-- 4. JSON per round
agg_round AS (
  SELECT
    player_id,
    jsonb_object_agg(round, round_json) AS ages_by_round_json
  FROM (
    SELECT
      player_id,
      round,
      jsonb_object_agg(match_number_round::text, age ORDER BY match_number_round) AS round_json
    FROM (
      SELECT
        player_id,
        round,
        age,
        ROW_NUMBER() OVER (PARTITION BY player_id, round ORDER BY id) AS match_number_round
      FROM base
    ) y
    GROUP BY player_id, round
  ) x
  GROUP BY player_id
),

-- 5. JSON per best_of
agg_best_of AS (
  SELECT
    player_id,
    jsonb_object_agg(best_of, bestof_json) AS ages_by_best_of_json
  FROM (
    SELECT
      player_id,
      best_of,
      jsonb_object_agg(match_number_bestof::text, age ORDER BY match_number_bestof) AS bestof_json
    FROM (
      SELECT
        player_id,
        best_of,
        age,
        ROW_NUMBER() OVER (PARTITION BY player_id, best_of ORDER BY id) AS match_number_bestof
      FROM base
    ) y
    GROUP BY player_id, best_of
  ) x
  GROUP BY player_id
)

SELECT
  a.player_id,
  a.ages_json,
  s.ages_by_surface_json,
  l.ages_by_level_json,
  r.ages_by_round_json,
  b.ages_by_best_of_json
FROM agg_total a
LEFT JOIN agg_surface s ON s.player_id = a.player_id
LEFT JOIN agg_level   l ON l.player_id = a.player_id
LEFT JOIN agg_round   r ON r.player_id = a.player_id
LEFT JOIN agg_best_of b ON b.player_id = a.player_id;
