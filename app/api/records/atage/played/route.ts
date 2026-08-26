import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const ageParam = url.searchParams.get('age');
    if (!ageParam) return NextResponse.json({ error: 'Age parameter required' }, { status: 400 });
    const targetAge = Number(ageParam);
    if (!Number.isFinite(targetAge)) return NextResponse.json({ error: 'Invalid age parameter' }, { status: 400 });

    const afterRaw = String(url.searchParams.get('after') ?? '').toLowerCase();
    const after = afterRaw === '1' || afterRaw === 'true' || afterRaw === 'yes';
    const surfaces = url.searchParams.getAll('surface').filter(Boolean);
    const levels = url.searchParams.getAll('level').filter(Boolean);
    const rounds = url.searchParams.getAll('round').filter(Boolean);
    const bestOf = url.searchParams.getAll('best_of').map(Number).filter(Number.isInteger);
    const filtersCount = Number(!!surfaces.length) + Number(!!levels.length) + Number(!!rounds.length) + Number(!!bestOf.length);
    const limitRaw = Number(url.searchParams.get('limit') ?? '100');
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 100;

    type Row = { id: string; name: string; ioc: string; slug: string | null; played_at_age: bigint };
    let rows: Row[];

    if (filtersCount <= 1) {
      let ageJson: Prisma.Sql = Prisma.sql`m.ages_json`;
      if (surfaces.length === 1) ageJson = Prisma.sql`m.ages_by_surface_json -> ${surfaces[0]}`;
      else if (levels.length === 1) ageJson = Prisma.sql`m.ages_by_level_json -> ${levels[0]}`;
      else if (rounds.length === 1) ageJson = Prisma.sql`m.ages_by_round_json -> ${rounds[0]}`;
      else if (bestOf.length === 1) ageJson = Prisma.sql`m.ages_by_best_of_json -> ${String(bestOf[0])}`;
      const ageCondition = after
        ? Prisma.sql`j.value::double precision >= ${targetAge}`
        : Prisma.sql`j.value::double precision <= ${targetAge}`;

      rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT m.player_id AS id, COALESCE(p.player, '') AS name, COALESCE(p.ioc, '') AS ioc,
               p.slug, COUNT(*) AS played_at_age
        FROM mv_ages_played m
        JOIN "Player" p ON p.id = m.player_id
        CROSS JOIN LATERAL jsonb_each_text(COALESCE(${ageJson}, '{}'::jsonb)) AS j(key, value)
        WHERE ${ageCondition}
        GROUP BY m.player_id, p.player, p.ioc, p.slug
        ORDER BY played_at_age DESC, name ASC
        LIMIT ${limit}
      `);
    } else {
      const common: Prisma.Sql[] = [Prisma.sql`m.status = true`];
      if (surfaces.length) common.push(Prisma.sql`m.surface IN (${Prisma.join(surfaces)})`);
      if (levels.length) common.push(Prisma.sql`m.tourney_level IN (${Prisma.join(levels)})`);
      if (rounds.length) common.push(Prisma.sql`m.round IN (${Prisma.join(rounds)})`);
      if (bestOf.length) common.push(Prisma.sql`m.best_of IN (${Prisma.join(bestOf)})`);
      const winnerAge = after ? Prisma.sql`m.winner_age >= ${targetAge}` : Prisma.sql`m.winner_age <= ${targetAge}`;
      const loserAge = after ? Prisma.sql`m.loser_age >= ${targetAge}` : Prisma.sql`m.loser_age <= ${targetAge}`;

      rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
        WITH appearances AS (
          SELECT m.winner_id AS player_id
          FROM "Match" m
          WHERE ${Prisma.join(common, ' AND ')} AND m.winner_id IS NOT NULL AND m.winner_age IS NOT NULL AND ${winnerAge}
          UNION ALL
          SELECT m.loser_id AS player_id
          FROM "Match" m
          WHERE ${Prisma.join(common, ' AND ')} AND m.loser_id IS NOT NULL AND m.loser_age IS NOT NULL AND ${loserAge}
        )
        SELECT a.player_id AS id, COALESCE(p.player, '') AS name, COALESCE(p.ioc, '') AS ioc,
               p.slug, COUNT(*) AS played_at_age
        FROM appearances a
        JOIN "Player" p ON p.id = a.player_id
        GROUP BY a.player_id, p.player, p.ioc, p.slug
        ORDER BY played_at_age DESC, name ASC
        LIMIT ${limit}
      `);
    }

    return NextResponse.json(rows.map(r => ({
      ...r,
      id: String(r.id),
      played_at_age: Number(r.played_at_age),
    })));
  } catch (error) {
    console.error('[GET /api/records/atage/played] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
