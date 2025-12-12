
-- mv_neededto.sql
-- Calcola i tornei giocati necessari per arrivare al titolo #x
-- overall, per superficie e per livello. I conteggi ripartono da 1 per ciascun filtro.
-- Include SOLO i giocatori che hanno almeno un titolo.

DROP MATERIALIZED VIEW IF EXISTS mv_neededto;

CREATE MATERIALIZED VIEW mv_neededto AS
WITH unique_events AS (
    -- Una riga per (player, evento, surface, level).
    -- is_title = 1 se il giocatore ha round 'W' in quell'evento.
    SELECT
        pt.player_id,
        pt.event_id,
        pt.tourney_date,          -- timestamp/date
        pt.surface,
        pt.tourney_level,
        MAX(CASE WHEN pt.round = 'W' THEN 1 ELSE 0 END)::int AS is_title
    FROM "PlayerTournament" AS pt
    GROUP BY
        pt.player_id,
        pt.event_id,
        pt.tourney_date,
        pt.surface,
        pt.tourney_level
),
progress AS (
    -- Contatori cumulativi che ripartono da 1 per ciascun filtro
    SELECT
        ue.player_id,
        ue.event_id,
        ue.tourney_date,
        ue.surface,
        ue.tourney_level,
        ue.is_title,

        -- Overall
        COUNT(*)         OVER (PARTITION BY ue.player_id ORDER BY ue.tourney_date) AS played_overall,
        SUM(ue.is_title) OVER (PARTITION BY ue.player_id ORDER BY ue.tourney_date) AS titles_overall,

        -- Per superficie
        COUNT(*)         OVER (PARTITION BY ue.player_id, ue.surface ORDER BY ue.tourney_date) AS played_surface,
        SUM(ue.is_title) OVER (PARTITION BY ue.player_id, ue.surface ORDER BY ue.tourney_date) AS titles_surface,

        -- Per livello
        COUNT(*)         OVER (PARTITION BY ue.player_id, ue.tourney_level ORDER BY ue.tourney_date) AS played_level,
        SUM(ue.is_title) OVER (PARTITION BY ue.player_id, ue.tourney_level ORDER BY ue.tourney_date) AS titles_level
    FROM unique_events AS ue
),
players_with_titles AS (
    -- SOLO i giocatori che hanno almeno un titolo
    SELECT DISTINCT player_id
    FROM progress
    WHERE is_title = 1
),
overall_json AS (
    SELECT
        p.player_id,
        jsonb_agg(
            jsonb_build_object(
                'titles', p.titles_overall,
                'played', p.played_overall
            )
            ORDER BY p.titles_overall
        )
        FILTER (WHERE p.is_title = 1) AS overall_json
    FROM progress AS p
    JOIN players_with_titles AS w USING (player_id)
    GROUP BY p.player_id
),
surface_json AS (
    SELECT
        s.player_id,
        jsonb_object_agg(s.surface, s.steps) AS surface_json
    FROM (
        SELECT
            p.player_id,
            p.surface,
            jsonb_agg(
                jsonb_build_object(
                    'titles', p.titles_surface,
                    'played', p.played_surface
                )
                ORDER BY p.titles_surface
            ) AS steps
        FROM progress AS p
        JOIN players_with_titles AS w USING (player_id)
        WHERE p.is_title = 1
          AND p.surface IS NOT NULL
        GROUP BY p.player_id, p.surface
    ) AS s
    GROUP BY s.player_id
),
level_json AS (
    SELECT
        l.player_id,
        jsonb_object_agg(l.tourney_level, l.steps) AS level_json
    FROM (
        SELECT
            p.player_id,
            p.tourney_level,
            jsonb_agg(
                jsonb_build_object(
                    'titles', p.titles_level,
                    'played', p.played_level
                )
                ORDER BY p.titles_level
            ) AS steps
        FROM progress AS p
        JOIN players_with_titles AS w USING (player_id)
        WHERE p.is_title = 1
          AND p.tourney_level IS NOT NULL
        GROUP BY p.player_id, p.tourney_level
    ) AS l
    GROUP BY l.player_id
)
SELECT
    w.player_id,
    o.overall_json,
    s.surface_json,
       l.level_json
FROM players_with_titles AS w
JOIN overall_json AS o USING (player_id)
JOIN surface_json AS s USING (player_id)
JOIN level_json AS l USING (player_id)
