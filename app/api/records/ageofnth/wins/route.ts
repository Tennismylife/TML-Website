import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

function formatAge(age: number | null): string {
  if (age == null) return '-';
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
    const rounds = url.searchParams.getAll('round').filter(Boolean);
    const bestOf = url.searchParams.getAll('best_of').map(Number).filter(Number.isInteger);
    const filtersCount = Number(!!surfaces.length) + Number(!!levels.length) + Number(!!rounds.length) + Number(!!bestOf.length);

    type Row = { id: string; name: string; ioc: string; slug: string | null; age_at_win: number };
    let rows: Row[];

    if (filtersCount <= 1) {
      let ageJson: Prisma.Sql = Prisma.sql`m.ages_json`;
      if (surfaces.length === 1) ageJson = Prisma.sql`m.ages_by_surface_json -> ${surfaces[0]}`;
      else if (levels.length === 1) ageJson = Prisma.sql`m.ages_by_level_json -> ${levels[0]}`;
      else if (rounds.length === 1) ageJson = Prisma.sql`m.ages_by_round_json -> ${rounds[0]}`;
      else if (bestOf.length === 1) ageJson = Prisma.sql`m.ages_by_best_of_json -> ${String(bestOf[0])}`;

      rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT m.winner_id AS id, COALESCE(p.player, '') AS name, COALESCE(p.ioc, '') AS ioc,
               p.slug, nth.age_at_win
        FROM mv_ages_wins m
        JOIN "Player" p ON p.id = m.winner_id
        CROSS JOIN LATERAL (
          SELECT j.value::double precision AS age_at_win
          FROM jsonb_each_text(COALESCE(${ageJson}, '{}'::jsonb)) AS j(key, value)
          WHERE j.key ~ '^[0-9]+$' AND j.key::integer >= ${n}
          ORDER BY j.key::integer ASC
          LIMIT 1
        ) nth
        ORDER BY nth.age_at_win ASC, name ASC
        LIMIT ${limit}
      `);
    } else {
      const filters: Prisma.Sql[] = [
        Prisma.sql`m.status = true`, Prisma.sql`m.winner_id IS NOT NULL`, Prisma.sql`m.winner_age IS NOT NULL`,
      ];
      if (surfaces.length) filters.push(Prisma.sql`m.surface IN (${Prisma.join(surfaces)})`);
      if (levels.length) filters.push(Prisma.sql`m.tourney_level IN (${Prisma.join(levels)})`);
      if (rounds.length) filters.push(Prisma.sql`m.round IN (${Prisma.join(rounds)})`);
      if (bestOf.length) filters.push(Prisma.sql`m.best_of IN (${Prisma.join(bestOf)})`);

      rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
        WITH ranked AS (
          SELECT m.winner_id, m.winner_age,
                 ROW_NUMBER() OVER (
                   PARTITION BY m.winner_id
                   ORDER BY m.winner_age ASC, m.tourney_date ASC NULLS LAST, m.match_num ASC NULLS LAST, m.id ASC
                 ) AS rn
          FROM "Match" m
          WHERE ${Prisma.join(filters, ' AND ')}
        )
        SELECT r.winner_id AS id, COALESCE(p.player, '') AS name, COALESCE(p.ioc, '') AS ioc,
               p.slug, r.winner_age::double precision AS age_at_win
        FROM ranked r
        JOIN "Player" p ON p.id = r.winner_id
        WHERE r.rn = ${n}
        ORDER BY r.winner_age ASC, name ASC
        LIMIT ${limit}
      `);
    }

    return NextResponse.json(rows.map(r => ({ ...r, id: String(r.id), age_at_win: formatAge(Number(r.age_at_win)) })));
  } catch (error) {
    console.error('[GET /api/records/ageofnth/wins] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
