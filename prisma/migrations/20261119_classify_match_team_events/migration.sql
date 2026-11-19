BEGIN;

CREATE OR REPLACE FUNCTION public.is_match_team_event(level text, event_name text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(upper(btrim(level)) = 'D', false)
    OR COALESCE(
      btrim(event_name) ~* '^(Davis Cup|ATP Cup|United Cup|World Team Championship|Nations Cup|Laver Cup|World Team Cup|WCT Aetna World Cup|Fed Cup|Federation Cup|Billie Jean King Cup|BJK Cup|Wightman Cup|Hopman Cup)([^[:alnum:]]|$)',
      false
    );
$$;

CREATE OR REPLACE FUNCTION public.set_match_team_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.team_event := public.is_match_team_event(NEW.tourney_level, NEW.tourney_name);
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  schema_name text;
BEGIN
  FOREACH schema_name IN ARRAY ARRAY['public', 'wta'] LOOP
    IF to_regclass(format('%I."Match"', schema_name)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'CREATE OR REPLACE TRIGGER classify_match_team_event
       BEFORE INSERT OR UPDATE OF tourney_level, tourney_name, team_event
       ON %I."Match" FOR EACH ROW EXECUTE FUNCTION public.set_match_team_event()',
      schema_name
    );

    EXECUTE format(
      'UPDATE %I."Match"
       SET team_event = public.is_match_team_event(tourney_level, tourney_name)
       WHERE team_event IS DISTINCT FROM public.is_match_team_event(tourney_level, tourney_name)',
      schema_name
    );
    RAISE NOTICE 'Updated team_event in %', schema_name;
  END LOOP;
END;
$$;

COMMIT;
