import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

function formatAge(age: number) {
  const years = Math.floor(age);
  const days = Math.round((age - years) * 365);
  return `${years}y ${days}d`;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const n = Number(url.searchParams.get('n'));
    if (!Number.isInteger(n) || n <= 0) return NextResponse.json({ error: 'Invalid n parameter' }, { status: 400 });

    const limitRaw = Number(url.searchParams.get('limit'));
    const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 100;
    const surfaces = url.searchParams.getAll('surface').filter(Boolean);
    const levels = url.searchParams.getAll('level').filter(Boolean);

    const common: Prisma.Sql[] = [];
    if (surfaces.length) common.push(Prisma.sql`m.surface IN (${Prisma.join(surfaces)})`);
    if (levels.length) common.push(Prisma.sql`m.tourney_level IN (${Prisma.join(levels)})`);
    const commonWhere = common.length ? Prisma.sql`${Prisma.join(common, ' AND ')} AND ` : Prisma.empty;

    type Row = { id: string; name: string; ioc: string; slug: string | null; age_at_entry: number };
    const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
      WITH appearances AS (
        SELECT m.winner_id AS player_id, m.event_id, m.winner_age::double precision AS age
        FROM "Match" m
        WHERE ${commonWhere} m.winner_id IS NOT NULL AND m.event_id IS NOT NULL AND m.winner_age IS NOT NULL
        UNION ALL
        SELECT m.loser_id AS player_id, m.event_id, m.loser_age::double precision AS age
        FROM "Match" m
        WHERE ${commonWhere} m.loser_id IS NOT NULL AND m.event_id IS NOT NULL AND m.loser_age IS NOT NULL
      ), per_event AS (
        SELECT player_id, event_id, MIN(age) AS age
        FROM appearances
        GROUP BY player_id, event_id
      ), ranked AS (
        SELECT player_id, age,
               ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY age ASC, event_id ASC) AS rn
        FROM per_event
      )
      SELECT r.player_id AS id,
             COALESCE(p.player, '') AS name,
             COALESCE(p.ioc, '') AS ioc,
             p.slug,
             r.age AS age_at_entry
      FROM ranked r
      JOIN "Player" p ON p.id = r.player_id
      WHERE r.rn = ${n}
      ORDER BY r.age ASC, name ASC
      LIMIT ${limit}
    `);

    return NextResponse.json(rows.map(r => ({
      id: String(r.id),
      name: r.name,
      ioc: r.ioc,
      slug: r.slug,
      age_at_entry: formatAge(Number(r.age_at_entry)),
    })));
  } catch (error) {
    console.error('[GET /api/records/ageofnth/entries] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
