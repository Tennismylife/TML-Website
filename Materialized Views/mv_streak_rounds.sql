DROP MATERIALIZED VIEW IF EXISTS mv_streak_rounds;

CREATE MATERIALIZED VIEW mv_streak_rounds AS
WITH player_rounds AS (
  SELECT
    player_id,
    player_name,
    player_ioc,
    m.event_id,
    MAX(m.tourney_date) AS tourney_date,
    MAX(
      CASE m.round
        WHEN 'F' THEN 7
        WHEN 'SF' THEN 6
        WHEN 'QF' THEN 5
        WHEN 'R16' THEN 4
        WHEN 'R32' THEN 3
        WHEN 'R64' THEN 2
        ELSE 0
      END
    ) AS max_round_value
  FROM (
    SELECT winner_id AS player_id, winner_name AS player_name, winner_ioc AS player_ioc, id AS match_id FROM "Match"
    UNION ALL
    SELECT loser_id, loser_name, loser_ioc, id AS match_id FROM "Match"
  ) p
  JOIN "Match" m ON p.match_id = m.id
  WHERE m.team_event = FALSE AND m.round NOT IN ('RR', 'R128')
  GROUP BY player_id, player_name, player_ioc, m.event_id
),

round_levels AS (
  SELECT
    unnest(ARRAY['R64','R32','R16','QF','SF','F']) AS min_round,
    unnest(ARRAY[2,3,4,5,6,7]) AS round_value
),

streaks AS (
  SELECT
    pr.player_id,
    pr.player_name,
    pr.player_ioc,
    rl.min_round,
    pr.event_id,
    pr.tourney_date,
    pr.max_round_value,
    CASE WHEN pr.max_round_value >= rl.round_value THEN 1 ELSE 0 END AS reached
  FROM player_rounds pr
  CROSS JOIN round_levels rl
),

flagged AS (
  SELECT *,
         SUM(CASE WHEN reached = 0 THEN 1 ELSE 0 END)
           OVER (PARTITION BY player_id, min_round ORDER BY tourney_date)
           AS streak_group
  FROM streaks
),

grouped AS (
  SELECT
    player_id,
    player_name,
    player_ioc,
    min_round,
    streak_group,
    COUNT(*) FILTER (WHERE reached = 1) AS "maxStreak",
    ARRAY_AGG(event_id ORDER BY tourney_date) FILTER (WHERE reached = 1) AS event_ids
  FROM flagged
  WHERE reached = 1
  GROUP BY player_id, player_name, player_ioc, min_round, streak_group
)

SELECT
  player_id,
  player_name,
  player_ioc,
  min_round,
  "maxStreak",
  event_ids
FROM grouped
WHERE "maxStreak" > 1;
