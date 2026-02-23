import { prisma } from "./prisma";

export interface AgeRecord {
  id: string;
  name: string;
  ioc: string | null;
  ageDays: number;
  ageLabel: string; // "17y 2m 14d"
  date: string; // "YYYY-MM-DD"
}

function diffYMD(birth: Date, ref: Date) {
  let y = ref.getUTCFullYear() - birth.getUTCFullYear();
  let m = ref.getUTCMonth() - birth.getUTCMonth();
  let d = ref.getUTCDate() - birth.getUTCDate();
  if (d < 0) {
    const prevMonth = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 0));
    d += prevMonth.getUTCDate();
    m -= 1;
  }
  if (m < 0) {
    m += 12;
    y -= 1;
  }
  return { y, m, d };
}

function clampLimit(n: number | undefined): number {
  if (n == null || Number.isNaN(n)) n = 100;
  return Math.min(100, Math.max(1, Math.floor(n)));
}

// helper constructs vary by direction because order clauses cannot be bound as parameters
function buildAgeQuery(direction: 'youngest' | 'oldest'): string {
  const orderAges = direction === 'youngest' ? 'asc' : 'desc';
  const orderDate = direction === 'youngest' ? 'asc' : 'desc';

  return `
    select player_id,
           atpname,
           ioc,
           birthdate,
           date,
           floor(extract(epoch from date - birthdate) / 86400)::int as age_days
    from (
      select r."playerId" as player_id,
             p.atpname,
             p.ioc,
             p.birthdate,
             rd.date,
             row_number() over (
               partition by r."playerId"
               order by (date - birthdate) ${orderAges}, date ${orderDate}
             ) as rn
      from "Ranking" r
      join "Player" p on p.id = r."playerId"
      join "RankingDate" rd on rd.id = r."rankingDateId"
      where r.rank <= $1
        and p.birthdate is not null
        and rd.date >= p.birthdate
    ) sub
    where rn = 1
    order by age_days ${orderAges}
    limit $2;
  `;
}

async function fetchAgeRecords(
  top: number,
  limit: number,
  direction: 'youngest' | 'oldest'
): Promise<AgeRecord[]> {
  const sql = buildAgeQuery(direction);
  const rows: Array<{
    player_id: string;
    atpname: string | null;
    ioc: string | null;
    birthdate: Date;
    date: Date;
    age_days: number;
  }> = await prisma.$queryRawUnsafe(sql, top, limit);

  return rows.map((r) => {
    const { y, m, d } = diffYMD(r.birthdate, r.date);
    return {
      id: r.player_id,
      name: r.atpname ?? "",
      ioc: r.ioc,
      ageDays: r.age_days,
      ageLabel: `${y}y ${m}m ${d}d`,
      date: r.date.toISOString().slice(0, 10),
    };
  });
}

export async function getYoungestTop(top: number, limit?: number) {
  if (!Number.isInteger(top) || top < 1) {
    throw new Error("invalid top");
  }
  const l = clampLimit(limit);
  return fetchAgeRecords(top, l, 'youngest');
}

export async function getOldestTop(top: number, limit?: number) {
  if (!Number.isInteger(top) || top < 1) {
    throw new Error("invalid top");
  }
  const l = clampLimit(limit);
  return fetchAgeRecords(top, l, 'oldest');
}
