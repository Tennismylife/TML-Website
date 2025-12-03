DROP MATERIALIZED VIEW IF EXISTS mv_neededto_round;

CREATE MATERIALIZED VIEW mv_neededto_round AS
WITH unique_tournaments AS (
    SELECT 
        player_id,
        event_id,
        MIN(tourney_date) AS tourney_date,
        MIN(surface) AS surface,
        MIN(tourney_level) AS tourney_level
    FROM "PlayerTournament"
    GROUP BY player_id, event_id
),
-- Ordina tornei unici per giocatore, superficie, livello
ordered_tournaments AS (
    SELECT
        player_id,
        event_id,
        tourney_date,
        surface,
        tourney_level,
        ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY tourney_date) AS overall_number,
        ROW_NUMBER() OVER (PARTITION BY player_id, surface ORDER BY tourney_date) AS surface_number,
        ROW_NUMBER() OVER (PARTITION BY player_id, tourney_level ORDER BY tourney_date) AS level_number
    FROM unique_tournaments
),
-- Associa i round raggiunti
tournament_rounds AS (
    SELECT
        o.player_id,
        o.event_id,
        r.round,
        o.tourney_date,
        o.surface,
        o.tourney_level,
        o.overall_number,
        o.surface_number,
        o.level_number
    FROM ordered_tournaments o
    JOIN "PlayerTournament" r
      ON o.player_id = r.player_id
     AND o.event_id = r.event_id
),
-- Round occurrences overall
round_occurrences_overall AS (
    SELECT
        player_id,
        round,
        ROW_NUMBER() OVER (PARTITION BY player_id, round ORDER BY overall_number) AS round_number,
        overall_number AS played_to_round
    FROM tournament_rounds
),
-- Round occurrences per superficie
round_occurrences_surface AS (
    SELECT
        player_id,
        round,
        surface,
        ROW_NUMBER() OVER (PARTITION BY player_id, surface, round ORDER BY surface_number) AS round_number,
        surface_number AS played_to_round
    FROM tournament_rounds
),
-- Round occurrences per livello torneo
round_occurrences_level AS (
    SELECT
        player_id,
        round,
        tourney_level,
        ROW_NUMBER() OVER (PARTITION BY player_id, tourney_level, round ORDER BY level_number) AS round_number,
        level_number AS played_to_round
    FROM tournament_rounds
),
-- Aggregazioni JSON
overall_json AS (
    SELECT
        player_id,
        round,
        jsonb_agg(jsonb_build_object(
            'round_number', round_number,
            'played_to_round', played_to_round
        ) ORDER BY round_number) AS overall_json
    FROM round_occurrences_overall
    GROUP BY player_id, round
),
surface_json AS (
    SELECT
        player_id,
        round,
        jsonb_object_agg(surface, steps_array) AS surface_json
    FROM (
        SELECT
            player_id,
            round,
            surface,
            jsonb_agg(jsonb_build_object(
                'round_number', round_number,
                'played_to_round', played_to_round
            ) ORDER BY round_number) AS steps_array
        FROM round_occurrences_surface
        GROUP BY player_id, round, surface
    ) sub
    GROUP BY player_id, round
),
level_json AS (
    SELECT
        player_id,
        round,
        jsonb_object_agg(tourney_level, steps_array) AS level_json
    FROM (
        SELECT
            player_id,
            round,
            tourney_level,
            jsonb_agg(jsonb_build_object(
                'round_number', round_number,
                'played_to_round', played_to_round
            ) ORDER BY round_number) AS steps_array
        FROM round_occurrences_level
        GROUP BY player_id, round, tourney_level
    ) sub
    GROUP BY player_id, round
)
-- Output finale
SELECT
    o.player_id,
    o.round,
    o.overall_json,
    s.surface_json,
    l.level_json
FROM overall_json o
LEFT JOIN surface_json s USING (player_id, round)
LEFT JOIN level_json l USING (player_id, round)
ORDER BY o.player_id, o.round;
