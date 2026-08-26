import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedSurfaces = url.searchParams.getAll('surface').filter(Boolean);
    const selectedLevels = url.searchParams.getAll('level').filter(Boolean);
    const limitParam = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 100)));

    const filters: Prisma.Sql[] = [];
    if (selectedSurfaces.length) {
      filters.push(Prisma.sql`pt.surface IN (${Prisma.join(selectedSurfaces)})`);
    }
    if (selectedLevels.length) {
      filters.push(Prisma.sql`pt.tourney_level IN (${Prisma.join(selectedLevels)})`);
    }
    const whereSql = filters.length ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}` : Prisma.empty;

    type Row = {
      id: string;
      name: string;
      ioc: string;
      slug: string | null;
      entries: bigint;
      wins: bigint;
      percentage: number;
    };

    const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
      WITH agg AS (
        SELECT
          pt.player_id,
          COUNT(*) AS entries,
          COUNT(*) FILTER (WHERE pt.round = 'W') AS wins
        FROM "PlayerTournament" pt
        ${whereSql}
        GROUP BY pt.player_id
      )
      SELECT
        a.player_id AS id,
        COALESCE(p.atpname, p.player, '(Unknown)') AS name,
        COALESCE(p.ioc, '') AS ioc,
        p.slug,
        a.entries,
        a.wins,
        CASE WHEN a.entries > 0
          THEN ROUND((a.wins::numeric / a.entries::numeric) * 1000) / 10
          ELSE 0
        END::double precision AS percentage
      FROM agg a
      LEFT JOIN "Player" p ON p.id = a.player_id
      ORDER BY percentage DESC, a.wins DESC, name ASC
      LIMIT ${limitParam}
    `);

    const result = rows.map(r => ({
      id: String(r.id),
      name: r.name,
      ioc: r.ioc,
      slug: r.slug,
      entries: Number(r.entries),
      wins: Number(r.wins),
      percentage: Number(r.percentage),
    }));

    return NextResponse.json({
      FinalWins: result,
      definition: 'entries = unique tournaments played, wins = tournaments won, percentage = (wins / entries) * 100',
    });
  } catch (error) {
    console.error('[GET /api/records/roundsonentries/titles] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
