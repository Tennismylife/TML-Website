
DROP MATERIALIZED VIEW IF EXISTS mv_same_season_percentage;

CREATE MATERIALIZED VIEW mv_same_season_percentage AS
WITH events AS (
    SELECT
        m.year AS year,
        p.player_id,
        m.id AS match_id,  -- <--- usa l'id come chiave match
        COALESCE(m.surface, 'Unknown')       AS surface_key,
        COALESCE(m.tourney_level, 'Unknown') AS level_key,
        COALESCE(m.round, 'Unknown')         AS round_key,
        COALESCE(m.best_of::text, 'Unknown') AS best_of_key,
        p.is_win
    FROM "Match" AS m
    CROSS JOIN LATERAL (
        VALUES (m.winner_id::text, TRUE),
               (m.loser_id::text,  FALSE)
    ) AS p(player_id, is_win)
    WHERE m.status = TRUE
      AND p.player_id IS NOT NULL
      -- ====== Filtri opzionali: scommenta/adatta se necessari ======
      -- AND m.draw = 'S'                 -- solo singolare (se hai un campo per tipo draw)
      -- AND m.qualifying = FALSE         -- escludi qualificazioni
      -- AND m.tourney_level <> 'D'       -- escludi Davis Cup (se non la vuoi)
      -- AND (m.score IS NULL OR m.score NOT IN ('W/O','DEF','ABD')) -- escludi walkover/ritiri
),
totals AS (
    SELECT
        year,
        player_id,
        COUNT(DISTINCT match_id) AS total_played,
        COUNT(DISTINCT CASE WHEN is_win THEN match_id END) AS total_wins,
        CASE WHEN COUNT(DISTINCT match_id) > 0
             THEN ROUND(
                    (COUNT(DISTINCT CASE WHEN is_win THEN match_id END)::numeric
                     / COUNT(DISTINCT match_id)) * 100, 2)
             ELSE 0
        END AS win_rate
    FROM events
    GROUP BY year, player_id
),
surface_stats_base AS (
    SELECT
        year, player_id, surface_key,
        COUNT(DISTINCT match_id) AS played,
        COUNT(DISTINCT CASE WHEN is_win THEN match_id END) AS wins
    FROM events
    GROUP BY year, player_id, surface_key
),
level_stats_base AS (
    SELECT
        year, player_id, level_key,
        COUNT(DISTINCT match_id) AS played,
        COUNT(DISTINCT CASE WHEN is_win THEN match_id END) AS wins
    FROM events
    GROUP BY year, player_id, level_key
),
round_stats_base AS (
    SELECT
        year, player_id, round_key,
        COUNT(DISTINCT match_id) AS played,
        COUNT(DISTINCT CASE WHEN is_win THEN match_id END) AS wins
    FROM events
    GROUP BY year, player_id, round_key
),
best_of_stats_base AS (
    SELECT
        year, player_id, best_of_key,
        COUNT(DISTINCT match_id) AS played,
        COUNT(DISTINCT CASE WHEN is_win THEN match_id END) AS wins
    FROM events
    GROUP BY year, player_id, best_of_key
),
surface_agg AS (
    SELECT
        year, player_id,
        jsonb_object_agg(
            surface_key,
            jsonb_build_object(
                'played', played,
                'wins',   wins,
                'win_rate',
                    CASE WHEN played > 0
                         THEN ROUND((wins::numeric / played) * 100, 2)
                         ELSE 0
                    END
            )
            ORDER BY surface_key
        ) AS surface_stats
    FROM surface_stats_base
    GROUP BY year, player_id
),
level_agg AS (
    SELECT
        year, player_id,
        jsonb_object_agg(
            level_key,
            jsonb_build_object(
                'played', played,
                'wins',   wins,
                'win_rate',
                    CASE WHEN played > 0
                         THEN ROUND((wins::numeric / played) * 100, 2)
                         ELSE 0
                    END
            )
            ORDER BY level_key
        ) AS level_stats
    FROM level_stats_base
    GROUP BY year, player_id
),
round_agg AS (
    SELECT
        year, player_id,
        jsonb_object_agg(
            round_key,
            jsonb_build_object(
                'played', played,
                'wins',   wins,
                'win_rate',
                    CASE WHEN played > 0
                         THEN ROUND((wins::numeric / played) * 100, 2)
                         ELSE 0
                    END
            )
            ORDER BY round_key
        ) AS round_stats
    FROM round_stats_base
    GROUP BY year, player_id
),
best_of_agg AS (
    SELECT
        year, player_id,
        jsonb_object_agg(
            best_of_key,
            jsonb_build_object(
                'played', played,
                'wins',   wins,
                'win_rate',
                    CASE WHEN played > 0
                         THEN ROUND((wins::numeric / played) * 100, 2)
                         ELSE 0
                    END
            )
            ORDER BY best_of_key
        ) AS best_of_stats
    FROM best_of_stats_base
    GROUP BY year, player_id
)
SELECT
    t.year,
    t.player_id,
    t.total_played,
    t.total_wins,
    t.win_rate,
    s.surface_stats AS surface,
    l.level_stats   AS level,
    r.round_stats   AS round,
    b.best_of_stats AS best_of
FROM totals t
LEFT JOIN surface_agg s ON s.year = t.year AND s.player_id = t.player_id
LEFT JOIN level_agg   l ON l.year = t.year AND l.player_id = t.player_id
LEFT JOIN round_agg   r ON r.year = t.year AND r.player_id = t.player_id
LEFT JOIN best_of_agg b ON b.year = t.year AND b.player_id = t.player_id;
