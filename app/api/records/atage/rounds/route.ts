import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const ageParam = url.searchParams.get('age');
    const roundParam = url.searchParams.get('round');
    if (!ageParam || !roundParam) return NextResponse.json({ error: 'Age and round parameters required' }, { status: 400 });
    const targetAge = Number(ageParam);
    if (!Number.isFinite(targetAge)) return NextResponse.json({ error: 'Invalid age parameter' }, { status: 400 });

    const targetRound = String(roundParam);
    const afterRaw = String(url.searchParams.get('after') ?? '').toLowerCase();
    const after = afterRaw === '1' || afterRaw === 'true' || afterRaw === 'yes';
    const surfaces = url.searchParams.getAll('surface').filter(Boolean);
    const levels = url.searchParams.getAll('level').filter(Boolean);
    const limitRaw = Number(url.searchParams.get('limit') ?? '100');
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 100;

    const common: Prisma.Sql[] = [Prisma.sql`m.round = ${targetRound}`, Prisma.sql`m.team_event = false`];
    if (surfaces.length) common.push(Prisma.sql`m.surface IN (${Prisma.join(surfaces)})`);
    if (levels.length) common.push(Prisma.sql`m.tourney_level IN (${Prisma.join(levels)})`);
    const winnerAge = after ? Prisma.sql`m.winner_age > ${targetAge}` : Prisma.sql`m.winner_age < ${targetAge}`;
    const loserAge = after ? Prisma.sql`m.loser_age > ${targetAge}` : Prisma.sql`m.loser_age < ${targetAge}`;

    type Row = { id: string; name: string; ioc: string; slug: string | null; appearances_at_age: bigint };
    const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
      WITH appearances AS (
        SELECT m.winner_id AS player_id
        FROM "Match" m
        WHERE ${Prisma.join(common, ' AND ')}
          AND m.winner_id IS NOT NULL AND m.winner_age IS NOT NULL AND ${winnerAge}
        UNION ALL
        SELECT m.loser_id AS player_id
        FROM "Match" m
        WHERE ${Prisma.join(common, ' AND ')}
          AND m.loser_id IS NOT NULL AND m.loser_age IS NOT NULL AND ${loserAge}
      ), agg AS (
        SELECT player_id, COUNT(*) AS appearances_at_age
        FROM appearances
        GROUP BY player_id
      )
      SELECT a.player_id AS id,
             COALESCE(p.player, '') AS name,
             COALESCE(p.ioc, '') AS ioc,
             p.slug,
             a.appearances_at_age
      FROM agg a
      JOIN "Player" p ON p.id = a.player_id
      ORDER BY a.appearances_at_age DESC, name ASC
      LIMIT ${limit}
    `);

    return NextResponse.json(rows.map(r => ({
      id: String(r.id),
      name: r.name,
      ioc: r.ioc,
      slug: r.slug,
      appearances_at_age: Number(r.appearances_at_age),
    })));
  } catch (error) {
    console.error('[GET /api/records/atage/rounds] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
