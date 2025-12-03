DROP MATERIALIZED VIEW IF EXISTS mv_entries_ages;

CREATE MATERIALIZED VIEW mv_entries_ages AS
WITH matches_flat AS (
    -- una riga per giocatore per match (vincenti + perdenti)
    SELECT winner_id AS player_id,
           event_id,
           COALESCE(surface, 'Unknown')       AS surface,
           COALESCE(tourney_level, 'Unknown') AS tourney_level,
           winner_age::numeric                AS age
    FROM "Match"
    WHERE team_event = false
      AND winner_age IS NOT NULL
    UNION ALL
    SELECT loser_id  AS player_id,
           event_id,
           COALESCE(surface, 'Unknown')       AS surface,
           COALESCE(tourney_level, 'Unknown') AS tourney_level,
           loser_age::numeric                 AS age
    FROM "Match"
    WHERE team_event = false
      AND loser_age IS NOT NULL
),

-- 1 riga per (player, event, surface, level)
-- DISTINCT ON sceglie un’unica riga per evento; età è costante nell’evento.
entries AS (
    SELECT DISTINCT ON (player_id, event_id, surface, tourney_level)
           player_id,
           event_id,
           surface,
           tourney_level,
           ROUND(age, 3) AS age
    FROM matches_flat
    ORDER BY player_id, event_id, surface, tourney_level
),

-- conteggi per età (totale / per superficie / per livello)
by_total AS (
    SELECT player_id, age, COUNT(*) AS cnt
    FROM entries
    GROUP BY player_id, age
),
by_surface AS (
    SELECT player_id, surface, age, COUNT(*) AS cnt
    FROM entries
    GROUP BY player_id, surface, age
),
by_level AS (
    SELECT player_id, tourney_level, age, COUNT(*) AS cnt
    FROM entries
    GROUP BY player_id, tourney_level, age
),

-- cumulativi per età
cum_total AS (
    SELECT player_id, age,
           SUM(cnt) OVER (PARTITION BY player_id ORDER BY age) AS cum_cnt
    FROM by_total
),
cum_surface AS (
    SELECT player_id, surface, age,
           SUM(cnt) OVER (PARTITION BY player_id, surface ORDER BY age) AS cum_cnt
    FROM by_surface
),
cum_level AS (
    SELECT player_id, tourney_level, age,
           SUM(cnt) OVER (PARTITION BY player_id, tourney_level ORDER BY age) AS cum_cnt
    FROM by_level
),

-- JSON totale: { "età": cumulativo }
json_total AS (
    SELECT player_id,
           jsonb_object_agg(age::text, cum_cnt ORDER BY age) AS ages_json
    FROM cum_total
    GROUP BY player_id
),

-- JSON per superficie in due passaggi (evita annidamento nella stessa SELECT)
-- Passo 1: per ogni (player, surface) crea { "età": cumulativo }
json_surface_inner AS (
    SELECT player_id, surface,
           jsonb_object_agg(age::text, cum_cnt ORDER BY age) AS surface_json
    FROM cum_surface
    GROUP BY player_id, surface
),
-- Passo 2: per ogni player crea { "surface": { "età": cumulativo } }
json_surface AS (
    SELECT player_id,
           jsonb_object_agg(surface, surface_json ORDER BY surface) AS ages_by_surface_json
    FROM json_surface_inner
    GROUP BY player_id
),

-- JSON per livello in due passaggi (stessa logica)
json_level_inner AS (
    SELECT player_id, tourney_level,
           jsonb_object_agg(age::text, cum_cnt ORDER BY age) AS level_json
    FROM cum_level
    GROUP BY player_id, tourney_level
),
json_level AS (
    SELECT player_id,
           jsonb_object_agg(tourney_level, level_json ORDER BY tourney_level) AS ages_by_level_json
    FROM json_level_inner
    GROUP BY player_id
)

SELECT p.player_id,
       t.ages_json,
       s.ages_by_surface_json,
       l.ages_by_level_json
FROM (SELECT DISTINCT player_id FROM entries) AS p
LEFT JOIN json_total   AS t USING (player_id)
LEFT JOIN json_surface AS s USING (player_id)
LEFT JOIN json_level   AS l USING (player_id);