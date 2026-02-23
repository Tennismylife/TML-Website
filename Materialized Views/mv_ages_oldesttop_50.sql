-- materialized view for oldest players reaching top 50
DROP MATERIALIZED VIEW IF EXISTS mv_ages_oldesttop_50;
CREATE MATERIALIZED VIEW mv_ages_oldesttop_50 AS
WITH ranked AS (
    SELECT r."playerId"            AS player_id,
           r.rank,
           p.atpname,
           p.ioc,
           p.birthdate,
           rd.date,
           floor(extract(epoch FROM rd.date - p.birthdate)/86400)::int AS age_days,
           row_number() OVER (
               PARTITION BY r."playerId"
               ORDER BY (rd.date - p.birthdate) DESC, rd.date DESC
           ) AS rn
    FROM "Ranking" r
    JOIN "Player" p ON p.id = r."playerId"
    JOIN "RankingDate" rd ON rd.id = r."rankingDateId"
    WHERE r.rank <= 50
      AND p.birthdate IS NOT NULL
      AND rd.date >= p.birthdate
)
SELECT player_id, rank, atpname, ioc, birthdate, date, age_days
FROM ranked
WHERE rn = 1;
