DROP MATERIALIZED VIEW IF EXISTS mv_wins_ages;

CREATE MATERIALIZED VIEW mv_wins_ages AS
WITH base AS (
  SELECT
    m.winner_id,
    ROUND(m.winner_age::numeric, 3) AS age,
    COALESCE(m.surface, 'Unknown') AS surface,
    COALESCE(m.tourney_level, 'Unknown') AS tourney_level,
    COALESCE(m.round, 'Unknown') AS round,
    COALESCE(m.best_of::text, 'Unknown') AS best_of
  FROM "Match" m
  WHERE m.status = TRUE
    AND m.winner_age IS NOT NULL
),

-- 1. Conta vittorie per giocatore ed età
counts AS (
  SELECT
    winner_id,
    age,
    COUNT(*) AS wins_at_age
  FROM base
  GROUP BY winner_id, age
),

-- 2. Calcola il numero progressivo di vittorie (cumulative)
progressive AS (
  SELECT
    winner_id,
    age,
    SUM(wins_at_age) OVER (
      PARTITION BY winner_id
      ORDER BY age
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_wins
  FROM counts
),

-- 3. Aggrega tutto in JSON
agg_total AS (
  SELECT
    winner_id,
    jsonb_object_agg(age::text, cumulative_wins ORDER BY age) AS ages_json
  FROM progressive
  GROUP BY winner_id
),

-- 4. Aggregazioni per superficie
agg_surface AS (
  SELECT
    winner_id,
    jsonb_object_agg(surface, surface_json) AS ages_by_surface_json
  FROM (
    SELECT
      winner_id,
      surface,
      jsonb_object_agg(age::text, cumulative_wins ORDER BY age) AS surface_json
    FROM (
      SELECT
        winner_id,
        surface,
        age,
        SUM(COUNT(*)) OVER (
          PARTITION BY winner_id, surface
          ORDER BY age
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS cumulative_wins
      FROM base
      GROUP BY winner_id, surface, age
    ) x
    GROUP BY winner_id, surface
  ) y
  GROUP BY winner_id
),

-- 5. Aggregazioni per livello torneo
agg_level AS (
  SELECT
    winner_id,
    jsonb_object_agg(tourney_level, level_json) AS ages_by_level_json
  FROM (
    SELECT
      winner_id,
      tourney_level,
      jsonb_object_agg(age::text, cumulative_wins ORDER BY age) AS level_json
    FROM (
      SELECT
        winner_id,
        tourney_level,
        age,
        SUM(COUNT(*)) OVER (
          PARTITION BY winner_id, tourney_level
          ORDER BY age
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS cumulative_wins
      FROM base
      GROUP BY winner_id, tourney_level, age
    ) x
    GROUP BY winner_id, tourney_level
  ) y
  GROUP BY winner_id
),

-- 6. Aggregazioni per round
agg_round AS (
  SELECT
    winner_id,
    jsonb_object_agg(round, round_json) AS ages_by_round_json
  FROM (
    SELECT
      winner_id,
      round,
      jsonb_object_agg(age::text, cumulative_wins ORDER BY age) AS round_json
    FROM (
      SELECT
        winner_id,
        round,
        age,
        SUM(COUNT(*)) OVER (
          PARTITION BY winner_id, round
          ORDER BY age
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS cumulative_wins
      FROM base
      GROUP BY winner_id, round, age
    ) x
    GROUP BY winner_id, round
  ) y
  GROUP BY winner_id
),

-- 7. Aggregazioni per best_of
agg_best_of AS (
  SELECT
    winner_id,
    jsonb_object_agg(best_of, bestof_json) AS ages_by_best_of_json
  FROM (
    SELECT
      winner_id,
      best_of,
      jsonb_object_agg(age::text, cumulative_wins ORDER BY age) AS bestof_json
    FROM (
      SELECT
        winner_id,
        best_of,
        age,
        SUM(COUNT(*)) OVER (
          PARTITION BY winner_id, best_of
          ORDER BY age
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS cumulative_wins
      FROM base
      GROUP BY winner_id, best_of, age
    ) x
    GROUP BY winner_id, best_of
  ) y
  GROUP BY winner_id
)

-- 8. Join finale
SELECT
  a.winner_id,
  a.ages_json,
  s.ages_by_surface_json,
  l.ages_by_level_json,
  r.ages_by_round_json,
  b.ages_by_best_of_json
FROM agg_total a
LEFT JOIN agg_surface s ON s.winner_id = a.winner_id
LEFT JOIN agg_level l   ON l.winner_id = a.winner_id
LEFT JOIN agg_round r   ON r.winner_id = a.winner_id
LEFT JOIN agg_best_of b ON b.winner_id = a.winner_id;
