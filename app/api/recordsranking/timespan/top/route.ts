import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

function diffYMD(a: Date, b: Date) {
  let y = b.getUTCFullYear() - a.getUTCFullYear();
  let m = b.getUTCMonth() - a.getUTCMonth();
  let d = b.getUTCDate() - a.getUTCDate();
  if (d < 0) {
    d += new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0)).getUTCDate();
    m -= 1;
  }
  if (m < 0) { m += 12; y -= 1; }
  return { y, m, d };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const top = Number(url.searchParams.get('top'));
    if (!Number.isInteger(top) || top < 1) {
      return NextResponse.json({ error: "Param 'top' non valido (>=1)" }, { status: 400 });
    }
    const eoy = url.searchParams.get('eoy') === '1';

    const fromYearRaw = url.searchParams.get('fromYear');
    const toYearRaw = url.searchParams.get('toYear');
    const fromYear = fromYearRaw ? Number(fromYearRaw) : null;
    const toYear = toYearRaw ? Number(toYearRaw) : null;
    if ((fromYear !== null && (!Number.isInteger(fromYear) || fromYear < 1900)) ||
        (toYear !== null && (!Number.isInteger(toYear) || toYear < 1900)) ||
        (fromYear !== null && toYear !== null && fromYear > toYear)) {
      return NextResponse.json({ error: "Parametri 'fromYear'/'toYear' non validi." }, { status: 400 });
    }

    const dateFilters: Prisma.Sql[] = [];
    if (fromYear !== null) dateFilters.push(Prisma.sql`rd.date >= ${new Date(Date.UTC(fromYear, 0, 1))}`);
    if (toYear !== null) dateFilters.push(Prisma.sql`rd.date < ${new Date(Date.UTC(toYear + 1, 0, 1))}`);
    const dateWhere = dateFilters.length ? Prisma.sql`WHERE ${Prisma.join(dateFilters, ' AND ')}` : Prisma.empty;
    const eoyWhere = eoy ? Prisma.sql`WHERE rn = 1` : Prisma.empty;

    type Row = {
      id: string;
      name: string;
      ioc: string | null;
      first_date: Date;
      last_date: Date;
    };

    const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
      WITH ranked_dates AS (
        SELECT rd.id, rd.date,
               ROW_NUMBER() OVER (
                 PARTITION BY EXTRACT(YEAR FROM rd.date)
                 ORDER BY rd.date DESC
               ) AS rn
        FROM "RankingDate" rd
        ${dateWhere}
      ), dates AS (
        SELECT id, date FROM ranked_dates
        ${eoyWhere}
      ), agg AS (
        SELECT r."playerId" AS player_id,
               MIN(d.date) AS first_date,
               MAX(d.date) AS last_date
        FROM "Ranking" r
        JOIN dates d ON d.id = r."rankingDateId"
        WHERE r.rank <= ${top}
        GROUP BY r."playerId"
      )
      SELECT a.player_id AS id,
             COALESCE(p.atpname, a.player_id) AS name,
             p.ioc, a.first_date, a.last_date
      FROM agg a
      LEFT JOIN "Player" p ON p.id = a.player_id
      ORDER BY (a.last_date - a.first_date) DESC, a.last_date DESC, name ASC
      LIMIT 100
    `);

    const MS_PER_DAY = 86400000;
    return NextResponse.json(rows.map(r => {
      const timespanDays = Math.max(0, Math.floor((r.last_date.getTime() - r.first_date.getTime()) / MS_PER_DAY));
      const { y, m, d } = diffYMD(r.first_date, r.last_date);
      return {
        id: String(r.id),
        name: r.name,
        ioc: r.ioc,
        firstDate: r.first_date.toISOString().slice(0, 10),
        lastDate: r.last_date.toISOString().slice(0, 10),
        timespanDays,
        timespanLabel: `${y}y ${m}m ${d}d`,
      };
    }));
  } catch (error) {
    console.error('Error computing Top-X timespan:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
