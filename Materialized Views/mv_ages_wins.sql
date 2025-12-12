DROP MATERIALIZED VIEW IF EXISTS mv_wins_ages;

CREATE MATERIALIZED VIEW mv_wins_ages AS
WITH ordered_wins AS (
  SELECT
    m.id,  -- necessario per ROW_NUMBER negli aggregati per dimensione
    m.winner_id,
    ROUND(m.winner_age::numeric, 3) AS age,
    COALESCE(m.surface, 'Unknown') AS surface,
    COALESCE(m.tourney_level, 'Unknown') AS tourney_level,
    COALESCE(m.round, 'Unknown') AS round,
    COALESCE(m.best_of::text, 'Unknown') AS best_of,
    ROW_NUMBER() OVER (
      PARTITION BY m.winner_id
      ORDER BY m.id
    ) AS win_number
  FROM "Match" m
  WHERE m.status = TRUE
    AND m.winner_age IS NOT NULL
),

-- JSON totale
agg_total AS (
  SELECT
    winner_id,
    jsonb_object_agg(win_number::text, age ORDER BY win_number) AS ages_json
  FROM ordered_wins
  GROUP BY winner_id
),

-- JSON per superficie
agg_surface AS (
  SELECT
    winner_id,
    jsonb_object_agg(surface, surface_json) AS ages_by_surface_json
  FROM (
    SELECT
      winner_id,
      surface,
      jsonb_object_agg(win_number_surface::text, age ORDER BY win_number_surface) AS surface_json
    FROM (
      SELECT
        winner_id,
        surface,
        age,
        ROW_NUMBER() OVER (
          PARTITION BY winner_id, surface
          ORDER BY id
        ) AS win_number_surface
      FROM ordered_wins
    ) y
    GROUP BY winner_id, surface
  ) x
  GROUP BY winner_id
),

-- JSON per livello torneo
agg_level AS (
  SELECT
    winner_id,
    jsonb_object_agg(tourney_level, level_json) AS ages_by_level_json
  FROM (
    SELECT
      winner_id,
      tourney_level,
      jsonb_object_agg(win_number_level::text, age ORDER BY win_number_level) AS level_json
    FROM (
      SELECT
        winner_id,
        tourney_level,
        age,
        ROW_NUMBER() OVER (
          PARTITION BY winner_id, tourney_level
          ORDER BY id
        ) AS win_number_level
      FROM ordered_wins
    ) y
    GROUP BY winner_id, tourney_level
  ) x
  GROUP BY winner_id
),

-- JSON per round
agg_round AS (
  SELECT
    winner_id,
    jsonb_object_agg(round, round_json) AS ages_by_round_json
  FROM (
    SELECT
      winner_id,
      round,
      jsonb_object_agg(win_number_round::text, age ORDER BY win_number_round) AS round_json
    FROM (
      SELECT
        winner_id,
        round,
        age,
        ROW_NUMBER() OVER (
          PARTITION BY winner_id, round
          ORDER BY id
        ) AS win_number_round
      FROM ordered_wins
    ) y
    GROUP BY winner_id, round
  ) x
  GROUP BY winner_id
),

-- JSON per best_of
agg_best_of AS (
  SELECT
    winner_id,
    jsonb_object_agg(best_of, bestof_json) AS ages_by_best_of_json
  FROM (
    SELECT
      winner_id,
      best_of,
      jsonb_object_agg(win_number_bestof::text, age ORDER BY win_number_bestof) AS bestof_json
    FROM (
      SELECT
        winner_id,
        best_of,
        age,
        ROW_NUMBER() OVER (
          PARTITION BY winner_id, best_of
          ORDER BY id
        ) AS win_number_bestof
      FROM ordered_wins
    ) y
    GROUP BY winner_id, best_of
  ) x
  GROUP BY winner_id
)

-- Join finale
SELECT
  t.winner_id,
  t.ages_json,
  s.ages_by_surface_json,
  l.ages_by_level_json,
  r.ages_by_round_json,
  b.ages_by_best_of_json
FROM agg_total t
LEFT JOIN agg_surface s ON s.winner_id = t.winner_id
LEFT JOIN agg_level l   ON l.winner_id = t.winner_id
LEFT JOIN agg_round r   ON r.winner_id = t.winner_id
LEFT JOIN agg_best_of b ON b.winner_id = t.winner_id;
