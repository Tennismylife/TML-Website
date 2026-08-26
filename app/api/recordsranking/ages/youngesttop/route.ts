import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

function diffYMD(birth: Date, ref: Date) {
  let y = ref.getUTCFullYear() - birth.getUTCFullYear();
  let m = ref.getUTCMonth() - birth.getUTCMonth();
  let d = ref.getUTCDate() - birth.getUTCDate();
  if (d < 0) {
    d += new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 0)).getUTCDate();
    m -= 1;
  }
  if (m < 0) { m += 12; y -= 1; }
  return { y, m, d };
}

type Row = {
  player_id: string;
  atpname: string | null;
  ioc: string | null;
  birthdate: Date;
  date: Date;
  age_days: number;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const topParam = url.searchParams.get('top');
    const top = topParam === null ? 100 : Number(topParam);
    if (!Number.isInteger(top) || top < 1) {
      return NextResponse.json({ error: "Param 'top' non valido" }, { status: 400 });
    }

    let rows: Row[];
    if (top === 100) {
      rows = await prisma.mv_ages_youngesttop_100.findMany({
        orderBy: { age_days: 'asc' },
        take: 100,
      });
    } else if (top === 50) {
      rows = await prisma.mv_ages_youngesttop_50.findMany({
        orderBy: { age_days: 'asc' },
        take: 100,
      });
    } else {
      rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
        WITH best AS (
          SELECT DISTINCT ON (r."playerId")
            r."playerId" AS player_id,
            p.atpname,
            p.ioc,
            p.birthdate,
            rd.date,
            FLOOR(EXTRACT(EPOCH FROM (rd.date - p.birthdate)) / 86400)::integer AS age_days
          FROM "Ranking" r
          JOIN "RankingDate" rd ON rd.id = r."rankingDateId"
          JOIN "Player" p ON p.id = r."playerId"
          WHERE r.rank <= ${top}
            AND p.birthdate IS NOT NULL
            AND rd.date >= p.birthdate
          ORDER BY r."playerId", age_days ASC, rd.date ASC
        )
        SELECT player_id, atpname, ioc, birthdate, date, age_days
        FROM best
        ORDER BY age_days ASC, atpname ASC NULLS LAST
        LIMIT 100
      `);
    }

    return NextResponse.json(rows.map(r => {
      const birth = r.birthdate instanceof Date ? r.birthdate : new Date(r.birthdate);
      const date = r.date instanceof Date ? r.date : new Date(r.date);
      const { y, m, d } = diffYMD(birth, date);
      return {
        id: String(r.player_id),
        name: r.atpname ?? '',
        ioc: r.ioc ?? null,
        ageDays: Number(r.age_days),
        ageLabel: `${y}y ${m}m ${d}d`,
        date: date.toISOString().slice(0, 10),
      };
    }));
  } catch (error) {
    console.error('Error fetching youngest at Top X:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
