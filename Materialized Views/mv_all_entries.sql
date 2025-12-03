DROP MATERIALIZED VIEW IF EXISTS mv_all_entries;

CREATE MATERIALIZED VIEW mv_all_entries AS
SELECT player_id, event_id, age
FROM (
    SELECT
        player_id,
        event_id,
        age,
        ROW_NUMBER() OVER (PARTITION BY player_id, event_id ORDER BY age) AS rn
    FROM (
        SELECT winner_id AS player_id, event_id, winner_age AS age 
        FROM "Match"
        WHERE team_event = false
        UNION ALL
        SELECT loser_id AS player_id, event_id, loser_age AS age 
        FROM "Match"
        WHERE team_event = false
    ) AS combined
) AS ranked
WHERE rn = 1;
