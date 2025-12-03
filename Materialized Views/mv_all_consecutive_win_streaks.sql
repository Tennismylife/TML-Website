DROP MATERIALIZED VIEW IF EXISTS mv_all_consecutive_win_streaks;

CREATE MATERIALIZED VIEW mv_all_consecutive_win_streaks AS
WITH all_matches AS (
    SELECT id, winner_id AS player_id, loser_id, tourney_date, surface, tourney_level, best_of
    FROM "Match"
    WHERE status = true
),
player_results AS (
    SELECT player_id, id, tourney_date, surface, tourney_level, best_of, 1 AS win
    FROM all_matches
    UNION ALL
    SELECT loser_id AS player_id, id, tourney_date, surface, tourney_level, best_of, 0 AS win
    FROM all_matches
),
ordered_results AS (
    SELECT *
    FROM player_results
    ORDER BY player_id, tourney_date, id
),
-- Gruppi per streak globali
streaks_global AS (
    SELECT *,
        SUM(CASE WHEN win = 0 THEN 1 ELSE 0 END) OVER (PARTITION BY player_id ORDER BY tourney_date, id) AS loss_group
    FROM ordered_results
),
global_prep AS (
    SELECT player_id,
           loss_group AS grp,
           COUNT(*) AS total_wins,
           JSON_AGG(id ORDER BY tourney_date, id) AS match_ids
    FROM streaks_global
    WHERE win = 1
    GROUP BY player_id, loss_group
),
-- Gruppi per superficie
streaks_surface AS (
    SELECT *,
        SUM(CASE WHEN win = 0 THEN 1 ELSE 0 END) OVER (PARTITION BY player_id, surface ORDER BY tourney_date, id) AS loss_group_surface
    FROM ordered_results
),
surface_prep AS (
    SELECT player_id,
           COALESCE(surface,'Unknown') AS surface,
           loss_group_surface AS grp,
           COUNT(*) AS total_wins,
           JSON_AGG(id ORDER BY tourney_date, id) AS match_ids
    FROM streaks_surface
    WHERE win = 1
    GROUP BY player_id, COALESCE(surface,'Unknown'), loss_group_surface
),
surface_ranked AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY surface ORDER BY total_wins DESC) AS rn
    FROM surface_prep
),
-- Gruppi per livello torneo
streaks_level AS (
    SELECT *,
        SUM(CASE WHEN win = 0 THEN 1 ELSE 0 END) OVER (PARTITION BY player_id, tourney_level ORDER BY tourney_date, id) AS loss_group_level
    FROM ordered_results
),
level_prep AS (
    SELECT player_id,
           COALESCE(tourney_level,'Unknown') AS tourney_level,
           loss_group_level AS grp,
           COUNT(*) AS total_wins,
           JSON_AGG(id ORDER BY tourney_date, id) AS match_ids
    FROM streaks_level
    WHERE win = 1
    GROUP BY player_id, COALESCE(tourney_level,'Unknown'), loss_group_level
),
level_ranked AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY tourney_level ORDER BY total_wins DESC) AS rn
    FROM level_prep
),
-- Gruppi per best_of
streaks_best_of AS (
    SELECT *,
        SUM(CASE WHEN win = 0 THEN 1 ELSE 0 END) OVER (PARTITION BY player_id, best_of ORDER BY tourney_date, id) AS loss_group_best_of
    FROM ordered_results
),
best_of_prep AS (
    SELECT player_id,
           COALESCE(best_of::text,'Unknown') AS best_of,
           loss_group_best_of AS grp,
           COUNT(*) AS total_wins,
           JSON_AGG(id ORDER BY tourney_date, id) AS match_ids
    FROM streaks_best_of
    WHERE win = 1
    GROUP BY player_id, COALESCE(best_of::text,'Unknown'), loss_group_best_of
),
best_of_ranked AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY best_of ORDER BY total_wins DESC) AS rn
    FROM best_of_prep
),
-- JSON finale con top 100 per gruppo
global_json AS (
    SELECT JSON_AGG(obj) AS global_streak
    FROM (
        SELECT player_id, total_wins, match_ids
        FROM global_prep
        ORDER BY total_wins DESC
        LIMIT 100
    ) obj
),
surfaces_json AS (
    SELECT JSON_OBJECT_AGG(surface, streaks) AS surfaces_streak
    FROM (
        SELECT surface,
               JSON_AGG(obj ORDER BY obj.total_wins DESC) AS streaks
        FROM (
            SELECT surface, player_id, total_wins, match_ids
            FROM surface_ranked
            WHERE rn <= 100
        ) obj
        GROUP BY surface
    ) t
),
levels_json AS (
    SELECT JSON_OBJECT_AGG(tourney_level, streaks) AS levels_streak
    FROM (
        SELECT tourney_level,
               JSON_AGG(obj ORDER BY obj.total_wins DESC) AS streaks
        FROM (
            SELECT tourney_level, player_id, total_wins, match_ids
            FROM level_ranked
            WHERE rn <= 100
        ) obj
        GROUP BY tourney_level
    ) t
),
best_of_json AS (
    SELECT JSON_OBJECT_AGG(best_of, streaks) AS best_of_streak
    FROM (
        SELECT best_of,
               JSON_AGG(obj ORDER BY obj.total_wins DESC) AS streaks
        FROM (
            SELECT best_of, player_id, total_wins, match_ids
            FROM best_of_ranked
            WHERE rn <= 100
        ) obj
        GROUP BY best_of
    ) t
),
final_row AS (
    SELECT 
        1 AS id,
        (SELECT global_streak FROM global_json) AS global,
        (SELECT surfaces_streak FROM surfaces_json) AS surfaces,
        (SELECT levels_streak FROM levels_json) AS levels,
        (SELECT best_of_streak FROM best_of_json) AS best_of
)
SELECT * FROM final_row;
