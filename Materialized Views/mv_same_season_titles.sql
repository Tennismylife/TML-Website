DROP MATERIALIZED VIEW IF EXISTS mv_same_season_titles;

CREATE MATERIALIZED VIEW mv_same_season_titles AS
WITH unique_wins AS (
    SELECT DISTINCT
        winner_id AS player_id,
        winner_name AS player_name,
        year,
        surface,
        tourney_level,
        event_id
    FROM "Match"
    WHERE team_event = false
      AND round = 'F'
)
, surface_totals AS (
    SELECT 
        player_id,
        year,
        jsonb_object_agg(surface, cnt) AS surface_totals
    FROM (
        SELECT player_id, year, surface, COUNT(*) AS cnt
        FROM unique_wins
        GROUP BY player_id, year, surface
    ) t
    GROUP BY player_id, year
)
, level_totals AS (
    SELECT 
        player_id,
        year,
        jsonb_object_agg(tourney_level, cnt) AS level_totals
    FROM (
        SELECT player_id, year, tourney_level, COUNT(*) AS cnt
        FROM unique_wins
        GROUP BY player_id, year, tourney_level
    ) t
    GROUP BY player_id, year
)
SELECT
    u.player_id,
    u.player_name,
    u.year,
    COUNT(*) AS titles_in_year,
    st.surface_totals,
    lt.level_totals
FROM unique_wins u
LEFT JOIN surface_totals st
  ON u.player_id = st.player_id AND u.year = st.year
LEFT JOIN level_totals lt
  ON u.player_id = lt.player_id AND u.year = lt.year
GROUP BY u.player_id, u.player_name, u.year, st.surface_totals, lt.level_totals
ORDER BY u.player_name, u.year;
