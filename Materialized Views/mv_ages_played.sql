DROP MATERIALIZED VIEW IF EXISTS mv_played_ages;

CREATE MATERIALIZED VIEW mv_played_ages AS
WITH base AS (
  -- unisci winner + loser, normalizza NULL in 'Unknown'
  SELECT 
    winner_id AS player_id,
    ROUND(winner_age::numeric, 3) AS age,
    COALESCE(surface, 'Unknown') AS surface,
    COALESCE(tourney_level, 'Unknown') AS tourney_level,
    COALESCE(round, 'Unknown') AS round,
    COALESCE(best_of::text, 'Unknown') AS best_of
  FROM "Match"
  WHERE winner_age IS NOT NULL

  UNION ALL

  SELECT 
    loser_id AS player_id,
    ROUND(loser_age::numeric, 3) AS age,
    COALESCE(surface, 'Unknown') AS surface,
    COALESCE(tourney_level, 'Unknown') AS tourney_level,
    COALESCE(round, 'Unknown') AS round,
    COALESCE(best_of::text, 'Unknown') AS best_of
  FROM "Match"
  WHERE loser_age IS NOT NULL
),

-- conteggi base per tutte le combinazioni (non cumulativi)
agg AS (
  SELECT 
    player_id,
    age,
    surface,
    tourney_level,
    round,
    best_of,
    COUNT(*) AS cnt
  FROM base
  GROUP BY player_id, age, surface, tourney_level, round, best_of
),

-- ===== TOTALE per player_id, age -> serve per il totale cumulativo corretto =====
counts_total AS (
  SELECT
    player_id,
    age,
    SUM(cnt) AS cnt_total
  FROM agg
  GROUP BY player_id, age
),

progressive_total AS (
  SELECT
    player_id,
    age,
    SUM(cnt_total) OVER (
      PARTITION BY player_id
      ORDER BY age
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_cnt
  FROM counts_total
),

ages AS (
  SELECT 
    player_id,
    jsonb_object_agg(age::text, cumulative_cnt ORDER BY age) AS ages_json
  FROM progressive_total
  GROUP BY player_id
),

-- ===== Surface: conta per player_id, surface, age -> poi cumulativo per player_id+surface =====
counts_surface AS (
  SELECT player_id, surface, age, SUM(cnt) AS cnt_surface
  FROM agg
  GROUP BY player_id, surface, age
),

progressive_surface AS (
  SELECT
    player_id,
    surface,
    age,
    SUM(cnt_surface) OVER (
      PARTITION BY player_id, surface
      ORDER BY age
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_cnt
  FROM counts_surface
),

ages_surface AS (
  SELECT 
    player_id,
    jsonb_object_agg(surface, surface_json ORDER BY surface) AS ages_by_surface_json
  FROM (
    SELECT
      player_id,
      surface,
      jsonb_object_agg(age::text, cumulative_cnt ORDER BY age) AS surface_json
    FROM progressive_surface
    GROUP BY player_id, surface
  ) s
  GROUP BY player_id
),

-- ===== Level: stesso pattern =====
counts_level AS (
  SELECT player_id, tourney_level, age, SUM(cnt) AS cnt_level
  FROM agg
  GROUP BY player_id, tourney_level, age
),

progressive_level AS (
  SELECT
    player_id,
    tourney_level,
    age,
    SUM(cnt_level) OVER (
      PARTITION BY player_id, tourney_level
      ORDER BY age
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_cnt
  FROM counts_level
),

ages_level AS (
  SELECT 
    player_id,
    jsonb_object_agg(tourney_level, level_json ORDER BY tourney_level) AS ages_by_level_json
  FROM (
    SELECT
      player_id,
      tourney_level,
      jsonb_object_agg(age::text, cumulative_cnt ORDER BY age) AS level_json
    FROM progressive_level
    GROUP BY player_id, tourney_level
  ) l
  GROUP BY player_id
),

-- ===== Round: stesso pattern =====
counts_round AS (
  SELECT player_id, round, age, SUM(cnt) AS cnt_round
  FROM agg
  GROUP BY player_id, round, age
),

progressive_round AS (
  SELECT
    player_id,
    round,
    age,
    SUM(cnt_round) OVER (
      PARTITION BY player_id, round
      ORDER BY age
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_cnt
  FROM counts_round
),

ages_round AS (
  SELECT 
    player_id,
    jsonb_object_agg(round, round_json ORDER BY round) AS ages_by_round_json
  FROM (
    SELECT
      player_id,
      round,
      jsonb_object_agg(age::text, cumulative_cnt ORDER BY age) AS round_json
    FROM progressive_round
    GROUP BY player_id, round
  ) r
  GROUP BY player_id
),

-- ===== Best_of: stesso pattern =====
counts_bestof AS (
  SELECT player_id, best_of, age, SUM(cnt) AS cnt_bestof
  FROM agg
  GROUP BY player_id, best_of, age
),

progressive_bestof AS (
  SELECT
    player_id,
    best_of,
    age,
    SUM(cnt_bestof) OVER (
      PARTITION BY player_id, best_of
      ORDER BY age
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_cnt
  FROM counts_bestof
),

ages_bestof AS (
  SELECT 
    player_id,
    jsonb_object_agg(best_of, bestof_json ORDER BY best_of) AS ages_by_best_of_json
  FROM (
    SELECT
      player_id,
      best_of,
      jsonb_object_agg(age::text, cumulative_cnt ORDER BY age) AS bestof_json
    FROM progressive_bestof
    GROUP BY player_id, best_of
  ) b
  GROUP BY player_id
)

-- JOIN FINALE: unisci tutte le aggregazioni (totale + per-dimensione)
SELECT 
  a.player_id,
  a.ages_json,
  s.ages_by_surface_json,
  l.ages_by_level_json,
  r.ages_by_round_json,
  b.ages_by_best_of_json
FROM ages a
LEFT JOIN ages_surface s ON s.player_id = a.player_id
LEFT JOIN ages_level   l ON l.player_id = a.player_id
LEFT JOIN ages_round   r ON r.player_id = a.player_id
LEFT JOIN ages_bestof  b ON b.player_id = a.player_id;
