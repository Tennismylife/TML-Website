DROP MATERIALIZED VIEW IF EXISTS mv_h2h_count;

CREATE MATERIALIZED VIEW mv_h2h_count AS
WITH base AS (
    SELECT
        LEAST(winner_id, loser_id) AS p1,
        GREATEST(winner_id, loser_id) AS p2,
        surface,
        tourney_level,
        best_of,
        round,
        winner_id
    FROM "Match"
),
agg AS (
    SELECT
        p1, p2,
        surface, tourney_level, best_of, round,
        COUNT(*)::int AS total_matches,
        SUM((winner_id = p1)::int) AS wins_player1,
        SUM((winner_id = p2)::int) AS wins_player2,
        GROUPING(surface)       AS g_surface,
        GROUPING(tourney_level) AS g_tourney,
        GROUPING(best_of)       AS g_bestof,
        GROUPING(round)         AS g_round
    FROM base
    GROUP BY GROUPING SETS
    (
        (p1, p2),
        (surface, p1, p2),
        (tourney_level, p1, p2),
        (best_of, p1, p2),
        (round, p1, p2)
    )
)
SELECT
    ROW_NUMBER() OVER () AS id,

    -- Global H2H (top 100)
    COALESCE((
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'player1_id', p1,
                   'player2_id', p2,
                   'wins_player1', wins_player1,
                   'wins_player2', wins_player2,
                   'total_matches', total_matches
                 )
                 ORDER BY total_matches DESC
               )
        FROM (
            SELECT *
            FROM (
                SELECT *,
                       ROW_NUMBER() OVER (ORDER BY total_matches DESC) AS rn
                FROM agg
                WHERE g_surface = 1 AND g_tourney = 1 AND g_bestof = 1 AND g_round = 1
            ) t
            WHERE rn <= 100
        ) t_top
    ), '[]'::jsonb) AS global_h2h,

    -- By Surface (top 100 per surface)
    COALESCE((
        SELECT jsonb_object_agg(surface, pairs ORDER BY surface)
        FROM (
            SELECT surface,
                   jsonb_agg(
                     jsonb_build_object(
                       'player1_id', p1,
                       'player2_id', p2,
                       'wins_player1', wins_player1,
                       'wins_player2', wins_player2,
                       'total_matches', total_matches
                     )
                     ORDER BY total_matches DESC
                   ) AS pairs
            FROM (
                SELECT *
                FROM (
                    SELECT *,
                           ROW_NUMBER() OVER (PARTITION BY surface ORDER BY total_matches DESC) AS rn
                    FROM agg
                    WHERE g_surface = 0 AND g_tourney = 1 AND g_bestof = 1 AND g_round = 1
                      AND surface IS NOT NULL
                ) t
                WHERE rn <= 100
            ) t_filtered
            GROUP BY surface
        ) s
    ), '{}'::jsonb) AS by_surface,

    -- By Tourney Level (top 100 per level)
    COALESCE((
        SELECT jsonb_object_agg(tourney_level, pairs ORDER BY tourney_level)
        FROM (
            SELECT tourney_level,
                   jsonb_agg(
                     jsonb_build_object(
                       'player1_id', p1,
                       'player2_id', p2,
                       'wins_player1', wins_player1,
                       'wins_player2', wins_player2,
                       'total_matches', total_matches
                     )
                     ORDER BY total_matches DESC
                   ) AS pairs
            FROM (
                SELECT *
                FROM (
                    SELECT *,
                           ROW_NUMBER() OVER (PARTITION BY tourney_level ORDER BY total_matches DESC) AS rn
                    FROM agg
                    WHERE g_surface = 1 AND g_tourney = 0 AND g_bestof = 1 AND g_round = 1
                      AND tourney_level IS NOT NULL
                ) t
                WHERE rn <= 100
            ) t_filtered
            GROUP BY tourney_level
        ) t
    ), '{}'::jsonb) AS by_tourney_level,

    -- By Best Of (top 100 per best_of)
    COALESCE((
        SELECT jsonb_object_agg((best_of)::text, pairs ORDER BY (best_of)::text)
        FROM (
            SELECT best_of,
                   jsonb_agg(
                     jsonb_build_object(
                       'player1_id', p1,
                       'player2_id', p2,
                       'wins_player1', wins_player1,
                       'wins_player2', wins_player2,
                       'total_matches', total_matches
                     )
                     ORDER BY total_matches DESC
                   ) AS pairs
            FROM (
                SELECT *
                FROM (
                    SELECT *,
                           ROW_NUMBER() OVER (PARTITION BY best_of ORDER BY total_matches DESC) AS rn
                    FROM agg
                    WHERE g_surface = 1 AND g_tourney = 1 AND g_bestof = 0 AND g_round = 1
                      AND best_of IS NOT NULL
                ) t
                WHERE rn <= 100
            ) t_filtered
            GROUP BY best_of
        ) b
    ), '{}'::jsonb) AS by_best_of,

    -- By Round (top 100 per round)
    COALESCE((
        SELECT jsonb_object_agg(round, pairs ORDER BY round)
        FROM (
            SELECT round,
                   jsonb_agg(
                     jsonb_build_object(
                       'player1_id', p1,
                       'player2_id', p2,
                       'wins_player1', wins_player1,
                       'wins_player2', wins_player2,
                       'total_matches', total_matches
                     )
                     ORDER BY total_matches DESC
                   ) AS pairs
            FROM (
                SELECT *
                FROM (
                    SELECT *,
                           ROW_NUMBER() OVER (PARTITION BY round ORDER BY total_matches DESC) AS rn
                    FROM agg
                    WHERE g_surface = 1 AND g_tourney = 1 AND g_bestof = 1 AND g_round = 0
                      AND round IS NOT NULL
                ) t
                WHERE rn <= 100
            ) t_filtered
            GROUP BY round
        ) r
    ), '{}'::jsonb) AS by_round;
