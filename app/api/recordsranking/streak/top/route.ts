import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const top = Number(searchParams.get('top'));
    if (!Number.isInteger(top) || top < 1) {
      return NextResponse.json({ error: 'Invalid top parameter' }, { status: 400 });
    }

    type Row = {
      id: string;
      name: string;
      ioc: string | null;
      weeks: bigint;
      start_date: Date;
      end_date: Date;
    };

    const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
      WITH filtered AS (
        SELECT
          r."playerId" AS player_id,
          r."rankingDateId" AS ranking_date_id,
          rd.date,
          r."rankingDateId" -
            (ROW_NUMBER() OVER (
              PARTITION BY r."playerId"
              ORDER BY r."rankingDateId"
            ))::integer AS grp
        FROM "Ranking" r
        JOIN "RankingDate" rd ON rd.id = r."rankingDateId"
        WHERE r.rank <= ${top}
      ), streaks AS (
        SELECT
          player_id,
          grp,
          COUNT(*) AS weeks,
          MIN(date) AS start_date,
          MAX(date) AS end_date
        FROM filtered
        GROUP BY player_id, grp
      )

      SELECT
        s.player_id AS id,
        COALESCE(p.atpname, s.player_id) AS name,
        p.ioc,
        s.weeks,
        s.start_date,
        s.end_date
      FROM streaks s
      LEFT JOIN "Player" p ON p.id = s.player_id
      ORDER BY s.weeks DESC, s.end_date DESC, name ASC
      LIMIT 100
    `);

    return NextResponse.json(rows.map(r => ({
      id: String(r.id),
      name: r.name,
      ioc: r.ioc ?? undefined,
      weeks: Number(r.weeks),
      startDate: formatDate(r.start_date),
      endDate: formatDate(r.end_date),
    })));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
