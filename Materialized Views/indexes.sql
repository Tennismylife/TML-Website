-- =============================================
-- SEZIONE 1: INDICI PRINCIPALI (SEMPRE RACCOMANDATI)
-- =============================================

-- 1. Indice composto per filtri principali: surface, tourney_level, round, best_of
-- (Per query multi-filtro come WHERE surface = 'Erba' AND tourney_level = 'G')
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_match_filters 
ON "Match" (surface, tourney_level, round, best_of);

-- 2. Versione parziale per status = true (più efficiente se filtri sempre per match attivi)
-- Ometti se non usi status=true frequentemente
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_match_status_true_filters
ON "Match" (surface, tourney_level, round, best_of)
WHERE status = true;

-- 3. Indice per query su vincitore e età (es. GROUP BY winner_id, winner_age)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_match_winner_age 
ON "Match" (winner_id, winner_age);

-- 4. Indice composto per aggregazioni su tourney_level + vincitore + età
-- (Es. statistiche per torneo per età vincitori)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_match_tourney_winner_age 
ON "Match" (tourney_level, winner_id, winner_age);

-- 5. Indice parziale per lookup rapidi su winner_id con status = true
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_match_status_true_winner
ON "Match" (winner_id)
WHERE status = true;

-- =============================================
-- SEZIONE 2: INDICI OPZIONALI (SINGOLI COLONNA)
-- =============================================
-- Aggiungi solo se query isolate su queste colonne (verifica con EXPLAIN ANALYZE)
-- I composti spesso li coprono già, quindi monitora l'uso prima.

-- Indice su tourney_level (es. SELECT COUNT(*) WHERE tourney_level = 'A')
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_match_tourney_level 
ON "Match" (tourney_level);

-- Indice su winner_id (se query da solo, senza età)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_match_winner_id 
ON "Match" (winner_id);

-- Altri opzionali (scommenta se necessari):
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_match_surface ON "Match" (surface);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_match_round ON "Match" (round);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_match_best_of ON "Match" (best_of);

-- =============================================
-- OPZIONALE: SCRIPT PER DROPPare INDICI VECCHI (se ne hai già)
-- =============================================
-- DROP INDEX IF EXISTS idx_match_old_name;  -- Sostituisci con nomi esistenti

-- =============================================
-- VERIFICA FINALE (Esegui dopo la creazione)
-- =============================================
-- SELECT indexname, idx_scan, idx_tup_read, idx_tup_fetch 
-- FROM pg_stat_user_indexes 
-- WHERE relname = 'Match' 
-- ORDER BY idx_scan DESC;