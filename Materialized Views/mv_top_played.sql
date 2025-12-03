-- Totale partite giocate per giocatore (senza filtri)
DROP MATERIALIZED VIEW IF EXISTS mv_top_played;

CREATE MATERIALIZED VIEW mv_top_played AS
SELECT
    player_id,
    player_name,
    player_ioc,
    COUNT(*) AS total_played
FROM (
    SELECT winner_id AS player_id, winner_name AS player_name, winner_ioc AS player_ioc
    FROM "Match"
    WHERE status = true
    UNION ALL
    SELECT loser_id AS player_id, loser_name AS player_name, loser_ioc AS player_ioc
    FROM "Match"
    WHERE status = true
) AS all_players
GROUP BY player_id, player_name, player_ioc
ORDER BY total_played DESC;

-- Indice per velocizzare il fetch
CREATE INDEX idx_mv_top_played_player_id ON mv_top_played(player_id);
CREATE INDEX idx_mv_top_played_total_played ON mv_top_played(total_played DESC);