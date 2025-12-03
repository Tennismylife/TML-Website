-- Drop della materialized view esistente, se presente
DROP MATERIALIZED VIEW IF EXISTS mv_h2h_season;

-- Creazione della materialized view H2H per stagione con ID, nome e IOC (versione leggibile)
CREATE MATERIALIZED VIEW mv_h2h_season AS
WITH player_pairs AS (
    SELECT
        year,
        CASE WHEN winner_id < loser_id THEN winner_id ELSE loser_id END AS player_1_id,
        CASE WHEN winner_id < loser_id THEN loser_id ELSE winner_id END AS player_2_id,
        CASE WHEN winner_id < loser_id THEN winner_name ELSE loser_name END AS player_1_name,
        CASE WHEN winner_id < loser_id THEN loser_name ELSE winner_name END AS player_2_name,
        CASE WHEN winner_id < loser_id THEN winner_ioc ELSE loser_ioc END AS player_1_ioc,
        CASE WHEN winner_id < loser_id THEN loser_ioc ELSE winner_ioc END AS player_2_ioc
    FROM "Match"
)
SELECT
    year,
    player_1_id,
    player_2_id,
    player_1_name,
    player_2_name,
    player_1_ioc,
    player_2_ioc,
    COUNT(*) AS matches_played
FROM player_pairs
GROUP BY year, player_1_id, player_2_id, player_1_name, player_2_name, player_1_ioc, player_2_ioc
ORDER BY year, matches_played DESC;
