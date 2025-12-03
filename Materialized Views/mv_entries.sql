DROP MATERIALIZED VIEW IF EXISTS mv_entries;

CREATE MATERIALIZED VIEW mv_entries AS
WITH all_participations AS (
    SELECT winner_id AS player_id,
           winner_name AS player_name,
           winner_ioc AS player_ioc,
           event_id
    FROM "Match"
    WHERE team_event = false
    UNION ALL
    SELECT loser_id AS player_id,
           loser_name AS player_name,
           loser_ioc AS player_ioc,
           event_id
    FROM "Match"
    WHERE team_event = 'FALSE'
)
SELECT 
    player_id,
    player_name,
    player_ioc,
    COUNT(DISTINCT event_id) AS tournaments_played
FROM all_participations
GROUP BY player_id, player_name, player_ioc
ORDER BY tournaments_played DESC
LIMIT 100;

-- Creazione dell'indice sulla colonna player_id
CREATE INDEX idx_mv_entries_player_id
ON mv_entries(player_id);
