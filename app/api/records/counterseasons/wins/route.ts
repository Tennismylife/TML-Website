import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const surfaces = url.searchParams.getAll('surface').filter(Boolean);
    const levels = url.searchParams.getAll('level').filter(Boolean);
    const round = url.searchParams.get('round');
    const minWins = Math.max(1, Number.parseInt(url.searchParams.get('minWinsPerSeason') || '1', 10) || 1);
    const bestOfRaw = url.searchParams.get('best_of');
    const bestOf = bestOfRaw ? Number(bestOfRaw) : null;
    const limitRaw = Number(url.searchParams.get('limit') || '100');
    const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 100));

    const filters: Prisma.Sql[] = [Prisma.sql`m.winner_id IS NOT NULL`, Prisma.sql`m.year IS NOT NULL`, Prisma.sql`m.status = true`];
    if (surfaces.length) filters.push(Prisma.sql`m.surface IN (${Prisma.join(surfaces)})`);
    if (levels.length) filters.push(Prisma.sql`m.tourney_level IN (${Prisma.join(levels)})`);
    if (round) filters.push(Prisma.sql`m.round = ${round}`);
    if (bestOf !== null && Number.isFinite(bestOf)) filters.push(Prisma.sql`m.best_of = ${bestOf}`);

    type Row = {
      id: string;
      name: string;
      ioc: string;
      slug: string | null;
      total_seasons: bigint;
      seasons_list: number[];
    };

    const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
      WITH season_counts AS (
        SELECT m.winner_id, m.year, COUNT(*) AS wins
        FROM "Match" m
        WHERE ${Prisma.join(filters, ' AND ')}
        GROUP BY m.winner_id, m.year
        HAVING COUNT(*) >= ${minWins}
      )
      SELECT
        sc.winner_id AS id,
        COALESCE(p.atpname, p.player, '') AS name,
        COALESCE(p.ioc, '') AS ioc,
        p.slug,
        COUNT(*) AS total_seasons,
        ARRAY_AGG(sc.year ORDER BY sc.year) AS seasons_list
      FROM season_counts sc
      LEFT JOIN "Player" p ON p.id = sc.winner_id
      GROUP BY sc.winner_id, p.atpname, p.player, p.ioc, p.slug
      ORDER BY total_seasons DESC, name ASC
      LIMIT ${limit}
    `);

    return NextResponse.json({
      players: rows.map(r => ({
        id: String(r.id),
        name: r.name,
        ioc: r.ioc,
        slug: r.slug,
        totalSeasons: Number(r.total_seasons),
        seasonsList: (r.seasons_list || []).map(String),
      })),
    });
  } catch (error) {
    console.error('[GET /api/records/counterseasons/wins] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
