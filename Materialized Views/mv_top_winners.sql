-- Totale vittorie per giocatore (senza filtri)
DROP MATERIALIZED VIEW IF EXISTS mv_top_winners;

CREATE MATERIALIZED VIEW mv_top_winners AS
SELECT
    winner_id,
    winner_name,
    winner_ioc,
    COUNT(*) AS total_wins
FROM "Match"
WHERE status = true
GROUP BY winner_id, winner_name, winner_ioc
ORDER BY total_wins DESC;

DROP INDEX IF EXISTS idx_match_surface;
DROP INDEX IF EXISTS idx_match_level;
DROP INDEX IF EXISTS idx_match_round;
DROP INDEX IF EXISTS idx_match_bestof;

-- Indice per velocizzare il fetch
CREATE INDEX idx_match_surface ON "Match"(surface);
CREATE INDEX idx_match_level ON "Match"(tourney_level);
CREATE INDEX idx_match_round ON "Match"(round);
CREATE INDEX idx_match_bestof ON "Match"(best_of);

-- Combinato utile per GROUP BY + filtri
CREATE INDEX idx_match_winner_filters ON "Match"(winner_id, surface, tourney_level, round, best_of);