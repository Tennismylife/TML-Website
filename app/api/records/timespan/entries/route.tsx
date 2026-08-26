import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const surfaces = url.searchParams.getAll('surface').filter(Boolean);
    const levels = url.searchParams.getAll('level').filter(Boolean);
    const limitRaw = Number(url.searchParams.get('perPage') ?? url.searchParams.get('limit') ?? 100);
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 100;

    const filters: Prisma.Sql[] = [];
    if (surfaces.length) filters.push(Prisma.sql`pt.surface IN (${Prisma.join(surfaces)})`);
    if (levels.length) filters.push(Prisma.sql`pt.tourney_level IN (${Prisma.join(levels)})`);
    const whereSql = filters.length ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}` : Prisma.empty;

    type Row = {
      player_id: string;
      player_name: string;
      ioc: string | null;
      slug: string | null;
      span_json: any;
      max_days_between: number;
    };

    let rows: Row[];

    if (surfaces.length) {
      rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
        WITH per_group AS (
          SELECT
            pt.player_id,
            pt.surface AS grp,
            (ARRAY_AGG(pt.tourney_id ORDER BY pt.tourney_date ASC, pt.event_id ASC))[1] AS first_tourney_id,
            (ARRAY_AGG(pt.tourney_name ORDER BY pt.tourney_date ASC, pt.event_id ASC))[1] AS first_tourney_name,
            MIN(pt.tourney_date) AS first_tourney_date,
            (ARRAY_AGG(pt.tourney_id ORDER BY pt.tourney_date DESC, pt.event_id DESC))[1] AS last_tourney_id,
            (ARRAY_AGG(pt.tourney_name ORDER BY pt.tourney_date DESC, pt.event_id DESC))[1] AS last_tourney_name,
            MAX(pt.tourney_date) AS last_tourney_date,
            CEIL(EXTRACT(EPOCH FROM (MAX(pt.tourney_date) - MIN(pt.tourney_date))) / 86400.0)::int AS days_between
          FROM "PlayerTournament" pt
          ${whereSql}
          GROUP BY pt.player_id, pt.surface
        ), per_player AS (
          SELECT player_id,
                 JSONB_AGG(JSONB_BUILD_OBJECT(
                   'surface', grp,
                   'first_tourney_id', first_tourney_id,
                   'first_tourney_name', first_tourney_name,
                   'first_tourney_date', first_tourney_date,
                   'last_tourney_id', last_tourney_id,
                   'last_tourney_name', last_tourney_name,
                   'last_tourney_date', last_tourney_date,
                   'days_between', days_between
                 ) ORDER BY days_between DESC) AS span_json,
                 MAX(days_between) AS max_days_between
          FROM per_group GROUP BY player_id
        )
        SELECT pp.player_id,
               COALESCE(p.atpname, p.player, 'Unknown') AS player_name,
               p.ioc,
               p.slug,
               pp.span_json,
               pp.max_days_between
        FROM per_player pp
        LEFT JOIN "Player" p ON p.id = pp.player_id
        ORDER BY pp.max_days_between DESC, player_name ASC
        LIMIT ${limit}
      `);
    } else if (levels.length) {
      rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
        WITH per_group AS (
          SELECT
            pt.player_id,
            pt.tourney_level AS grp,
            (ARRAY_AGG(pt.tourney_id ORDER BY pt.tourney_date ASC, pt.event_id ASC))[1] AS first_tourney_id,
            (ARRAY_AGG(pt.tourney_name ORDER BY pt.tourney_date ASC, pt.event_id ASC))[1] AS first_tourney_name,
            MIN(pt.tourney_date) AS first_tourney_date,
            (ARRAY_AGG(pt.tourney_id ORDER BY pt.tourney_date DESC, pt.event_id DESC))[1] AS last_tourney_id,
            (ARRAY_AGG(pt.tourney_name ORDER BY pt.tourney_date DESC, pt.event_id DESC))[1] AS last_tourney_name,
            MAX(pt.tourney_date) AS last_tourney_date,
            CEIL(EXTRACT(EPOCH FROM (MAX(pt.tourney_date) - MIN(pt.tourney_date))) / 86400.0)::int AS days_between
          FROM "PlayerTournament" pt
          ${whereSql}
          GROUP BY pt.player_id, pt.tourney_level
        ), per_player AS (
          SELECT player_id,
                 JSONB_AGG(JSONB_BUILD_OBJECT(
                   'level', grp,
                   'first_tourney_id', first_tourney_id,
                   'first_tourney_name', first_tourney_name,
                   'first_tourney_date', first_tourney_date,
                   'last_tourney_id', last_tourney_id,
                   'last_tourney_name', last_tourney_name,
                   'last_tourney_date', last_tourney_date,
                   'days_between', days_between
                 ) ORDER BY days_between DESC) AS span_json,
                 MAX(days_between) AS max_days_between
          FROM per_group GROUP BY player_id
        )
        SELECT pp.player_id,
               COALESCE(p.atpname, p.player, 'Unknown') AS player_name,
               p.ioc,
               p.slug,
               pp.span_json,
               pp.max_days_between
        FROM per_player pp
        LEFT JOIN "Player" p ON p.id = pp.player_id
        ORDER BY pp.max_days_between DESC, player_name ASC
        LIMIT ${limit}
      `);
    } else {
      rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
        WITH per_player AS (
          SELECT
            pt.player_id,
            JSONB_BUILD_ARRAY(JSONB_BUILD_OBJECT(
              'first_tourney_id', (ARRAY_AGG(pt.tourney_id ORDER BY pt.tourney_date ASC, pt.event_id ASC))[1],
              'first_tourney_name', (ARRAY_AGG(pt.tourney_name ORDER BY pt.tourney_date ASC, pt.event_id ASC))[1],
              'first_tourney_date', MIN(pt.tourney_date),
              'last_tourney_id', (ARRAY_AGG(pt.tourney_id ORDER BY pt.tourney_date DESC, pt.event_id DESC))[1],
              'last_tourney_name', (ARRAY_AGG(pt.tourney_name ORDER BY pt.tourney_date DESC, pt.event_id DESC))[1],
              'last_tourney_date', MAX(pt.tourney_date),
              'days_between', CEIL(EXTRACT(EPOCH FROM (MAX(pt.tourney_date) - MIN(pt.tourney_date))) / 86400.0)::int
            )) AS span_json,
            CEIL(EXTRACT(EPOCH FROM (MAX(pt.tourney_date) - MIN(pt.tourney_date))) / 86400.0)::int AS max_days_between
          FROM "PlayerTournament" pt
          GROUP BY pt.player_id
        )
        SELECT pp.player_id,
               COALESCE(p.atpname, p.player, 'Unknown') AS player_name,
               p.ioc,
               p.slug,
               pp.span_json,
               pp.max_days_between
        FROM per_player pp
        LEFT JOIN "Player" p ON p.id = pp.player_id
        ORDER BY pp.max_days_between DESC, player_name ASC
        LIMIT ${limit}
      `);
    }

    const result = rows.map(r => {
      const base = {
        player_id: String(r.player_id),
        player_name: r.player_name,
        ioc: r.ioc,
        slug: r.slug,
      };
      if (surfaces.length) return { ...base, surface_timespan: r.span_json };
      if (levels.length) return { ...base, level_timespan: r.span_json };
      return { ...base, overall_timespan: r.span_json };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/records/timespan/entries] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
