-- mv_notify_trigger.sql
-- This creates a trigger function that sends a NOTIFY when relevant tables change.
-- Adjust table names if necessary to match your schema.

CREATE OR REPLACE FUNCTION notify_mvs() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('mvs_needs_refresh', TG_TABLE_NAME || ':' || TG_OP);
  RETURN NEW;
END;
$$;

-- Example triggers (change table names if necessary to match your schema):
-- If your tables are lowercase (unquoted), use names like match, player, tournament.
-- If your tables are created with Prisma default names, they might be quoted (Match, Player, etc.).

-- On matches
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Match' AND relkind = 'r') THEN
    CREATE TRIGGER notify_on_match_change
      AFTER INSERT OR UPDATE OR DELETE ON "Match"
      FOR EACH ROW EXECUTE FUNCTION notify_mvs();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'match' AND relkind = 'r') THEN
    CREATE TRIGGER notify_on_match_change_lower
      AFTER INSERT OR UPDATE OR DELETE ON match
      FOR EACH ROW EXECUTE FUNCTION notify_mvs();
  END IF;
END $$;

-- On players
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Player' AND relkind = 'r') THEN
    CREATE TRIGGER notify_on_player_change
      AFTER INSERT OR UPDATE OR DELETE ON "Player"
      FOR EACH ROW EXECUTE FUNCTION notify_mvs();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'player' AND relkind = 'r') THEN
    CREATE TRIGGER notify_on_player_change_lower
      AFTER INSERT OR UPDATE OR DELETE ON player
      FOR EACH ROW EXECUTE FUNCTION notify_mvs();
  END IF;
END $$;

-- On tournaments
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Tournament' AND relkind = 'r') THEN
    CREATE TRIGGER notify_on_tourney_change
      AFTER INSERT OR UPDATE OR DELETE ON "Tournament"
      FOR EACH ROW EXECUTE FUNCTION notify_mvs();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tournament' AND relkind = 'r') THEN
    CREATE TRIGGER notify_on_tourney_change_lower
      AFTER INSERT OR UPDATE OR DELETE ON tournament
      FOR EACH ROW EXECUTE FUNCTION notify_mvs();
  END IF;
END $$;

-- On player_tournament / PlayerTournament
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'PlayerTournament' AND relkind = 'r') THEN
    CREATE TRIGGER notify_on_playertourney_change
      AFTER INSERT OR UPDATE OR DELETE ON "PlayerTournament"
      FOR EACH ROW EXECUTE FUNCTION notify_mvs();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'playertournament' AND relkind = 'r') THEN
    CREATE TRIGGER notify_on_playertourney_change_lower
      AFTER INSERT OR UPDATE OR DELETE ON playertournament
      FOR EACH ROW EXECUTE FUNCTION notify_mvs();
  END IF;
END $$;

-- On rankings (if you use ranking tables)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Ranking' AND relkind = 'r') THEN
    CREATE TRIGGER notify_on_ranking_change
      AFTER INSERT OR UPDATE OR DELETE ON "Ranking"
      FOR EACH ROW EXECUTE FUNCTION notify_mvs();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ranking' AND relkind = 'r') THEN
    CREATE TRIGGER notify_on_ranking_change_lower
      AFTER INSERT OR UPDATE OR DELETE ON ranking
      FOR EACH ROW EXECUTE FUNCTION notify_mvs();
  END IF;
END $$;

-- Add more triggers for other tables that affect your materialized views if needed.

-- NOTE:
-- Run this file once in the DB (psql -f mv_notify_trigger.sql) to install triggers.
-- The listener (see scripts/refresh-mvs-listener.js) should be running to pick up notifications.
