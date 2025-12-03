DROP MATERIALIZED VIEW IF EXISTS "mv_stats";

CREATE MATERIALIZED VIEW "mv_stats" AS
SELECT
    m."id",
    m."winner_id",
    m."loser_id",
    m."surface",
    m."year",
    m."tourney_level",
    m."w_ace",
    m."w_df",
    m."w_svpt",
    m."w_1stIn",
    m."w_1stWon",
    m."w_2ndWon",
    m."w_SvGms",
    m."w_bpSaved",
    m."w_bpFaced",
    m."l_ace",
    m."l_df",
    m."l_svpt",
    m."l_1stIn",
    m."l_1stWon",
    m."l_2ndWon",
    m."l_SvGms",
    m."l_bpSaved",
    m."l_bpFaced",
    CASE 
        WHEN m."w_ace" IS NOT NULL
         AND m."w_df" IS NOT NULL
         AND m."w_svpt" IS NOT NULL
         AND m."w_1stIn" IS NOT NULL
         AND m."w_1stWon" IS NOT NULL
         AND m."w_2ndWon" IS NOT NULL
         AND m."w_SvGms" IS NOT NULL
         AND m."w_bpSaved" IS NOT NULL
         AND m."w_bpFaced" IS NOT NULL
         AND m."l_ace" IS NOT NULL
         AND m."l_df" IS NOT NULL
         AND m."l_svpt" IS NOT NULL
         AND m."l_1stIn" IS NOT NULL
         AND m."l_1stWon" IS NOT NULL
         AND m."l_2ndWon" IS NOT NULL
         AND m."l_SvGms" IS NOT NULL
         AND m."l_bpSaved" IS NOT NULL
         AND m."l_bpFaced" IS NOT NULL
        THEN TRUE
        ELSE FALSE
    END AS "stats",
    sets."w_setsWon",
    sets."l_setsWon",
    sets."w_gmsWon",
    sets."l_gmsWon",
    sets."w_tbWon",
    sets."l_tbWon"
FROM "Match" m
CROSS JOIN LATERAL (
    SELECT
        COUNT(CASE 
            WHEN regexp_replace(split_part(s,'-',1), '\([0-9]+\)', '', 'g')::int
                 >
                 regexp_replace(split_part(s,'-',2), '\([0-9]+\)', '', 'g')::int
            THEN 1 END) AS "w_setsWon",
        COUNT(CASE 
            WHEN regexp_replace(split_part(s,'-',2), '\([0-9]+\)', '', 'g')::int
                 >
                 regexp_replace(split_part(s,'-',1), '\([0-9]+\)', '', 'g')::int
            THEN 1 END) AS "l_setsWon",
        SUM(regexp_replace(split_part(s,'-',1), '\([0-9]+\)', '', 'g')::int) AS "w_gmsWon",
        SUM(regexp_replace(split_part(s,'-',2), '\([0-9]+\)', '', 'g')::int) AS "l_gmsWon",
        COUNT(CASE 
            WHEN regexp_replace(split_part(s,'-',1), '\([0-9]+\)', '', 'g')::int = 7
             AND regexp_replace(split_part(s,'-',2), '\([0-9]+\)', '', 'g')::int = 6
            THEN 1 END) AS "w_tbWon",
        COUNT(CASE 
            WHEN regexp_replace(split_part(s,'-',1), '\([0-9]+\)', '', 'g')::int = 6
             AND regexp_replace(split_part(s,'-',2), '\([0-9]+\)', '', 'g')::int = 7
            THEN 1 END) AS "l_tbWon"
    FROM unnest(string_to_array(m."score",' ')) AS s
    WHERE s ~ '^\d+-\d+(\([0-9]+\))?$'
) AS sets;
