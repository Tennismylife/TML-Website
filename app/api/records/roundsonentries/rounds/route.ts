import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const surfaces = url.searchParams.getAll('surface').filter(Boolean);
    const levels = url.searchParams.getAll('level').filter(Boolean);
    const targetRound = String(url.searchParams.get('round') ?? '').toUpperCase();
    const limitRaw = Number(url.searchParams.get('limit') ?? '100');
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 100;
    const debugMode = url.searchParams.get('debug') === '1' || url.searchParams.get('debug') === 'true';

    if (!targetRound) return NextResponse.json({ error: 'Missing round parameter' }, { status: 400 });

    const filters: Prisma.Sql[] = [];
    if (surfaces.length) filters.push(Prisma.sql`pt.surface IN (${Prisma.join(surfaces)})`);
    if (levels.length) filters.push(Prisma.sql`pt.tourney_level IN (${Prisma.join(levels)})`);
    const whereSql = filters.length ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}` : Prisma.empty;

    type Row = {
      id: string; name: string; ioc: string; slug: string | null;
      entries: bigint; wins: bigint; percentage: number;
    };

    const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
      WITH agg AS (
        SELECT
          pt.player_id,
          COUNT(*) AS entries,
          COUNT(*) FILTER (WHERE UPPER(pt.round) = ${targetRound}) AS wins
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
          THEN LEAST(100, (ROUND((a.wins::numeric / a.entries::numeric) * 1000) / 10)::double precision)
          ELSE 0
        END AS percentage
      FROM agg a
      LEFT JOIN "Player" p ON p.id = a.player_id
      WHERE a.wins > 0
      ORDER BY percentage DESC, a.wins DESC, a.entries DESC, name ASC
      LIMIT ${limit}
    `);

    const finalRows = rows.map(r => ({
      id: String(r.id),
      name: r.name,
      ioc: r.ioc,
      slug: r.slug,
      entries: Number(r.entries),
      wins: Number(r.wins),
      percentage: Number(r.percentage),
    }));

    const payload: any = {
      targetRound,
      FinalWins: finalRows,
      definition: `entries = unique tournaments played, wins = tournaments where player reached ${targetRound}, percentage = 100 × (wins / entries)`,
    };

    if (debugMode && finalRows.length) {
      const ids = finalRows.map(r => r.id);
      const debugFilters: Prisma.Sql[] = [Prisma.sql`pt.player_id IN (${Prisma.join(ids)})`];
      if (surfaces.length) debugFilters.push(Prisma.sql`pt.surface IN (${Prisma.join(surfaces)})`);
      if (levels.length) debugFilters.push(Prisma.sql`pt.tourney_level IN (${Prisma.join(levels)})`);
      type DebugRow = { player_id: string; event_id: string; round: string };
      const debugRows = await prisma.$queryRaw<DebugRow[]>(Prisma.sql`
        SELECT pt.player_id, pt.event_id, pt.round
        FROM "PlayerTournament" pt
        WHERE ${Prisma.join(debugFilters, ' AND ')}
      `);
      const entries: Record<string, string[]> = {};
      const wins: Record<string, string[]> = {};
      for (const row of debugRows) {
        const id = String(row.player_id);
        (entries[id] ??= []).push(String(row.event_id));
        if (String(row.round).toUpperCase() === targetRound) {
          (wins[id] ??= []).push(String(row.event_id));
        }
      }
      payload.debug = { entries, wins };
      payload.FinalWins = finalRows.map(r => ({
        ...r,
        entryEventIds: entries[r.id] ?? [],
        winEventIds: wins[r.id] ?? [],
      }));
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('[GET /api/records/roundsonentries/rounds] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
