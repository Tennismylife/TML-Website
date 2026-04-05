import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roundParam = searchParams.get("round");
    const selectedSurfaces = searchParams.getAll("surface");
    const selectedLevels = searchParams.getAll("level");
    const limitParam = Math.max(1, Math.min(100, Number(searchParams.get('perPage') ?? searchParams.get('limit') ?? 100)));

    if (!roundParam) {
      return NextResponse.json({ error: "Round parameter is required" }, { status: 400 });
    }

    // Build dynamic WHERE fragments so all filtering happens inside the DB.
    // Using raw SQL with GROUP BY avoids loading potentially thousands of rows
    // into Node.js memory before sorting/slicing.
    const levelCond = selectedLevels.length > 0
      ? Prisma.sql`AND "tourney_level" = ANY(${selectedLevels}::text[])`
      : Prisma.empty;
    const surfaceCond = selectedSurfaces.length > 0
      ? Prisma.sql`AND "surface" = ANY(${selectedSurfaces}::text[])`
      : Prisma.empty;

    // CTE computes the timespan per player entirely inside PostgreSQL.
    // LATERAL JOINs retrieve the tournament names for the top-N players only.
    const rows = await prisma.$queryRaw<Array<{
      player_id: string;
      span_days: bigint;
      first_date: Date;
      last_date: Date;
      first_tourney: string;
      last_tourney: string;
      name: string;
      ioc: string | null;
      slug: string | null;
    }>>`
      WITH spans AS (
        SELECT
          player_id,
          MIN(tourney_date) AS first_date,
          MAX(tourney_date) AS last_date,
          EXTRACT(EPOCH FROM (MAX(tourney_date) - MIN(tourney_date)))::bigint / 86400 AS span_days
        FROM "PlayerTournament"
        WHERE round = ${roundParam}
          ${levelCond}
          ${surfaceCond}
          AND tourney_date IS NOT NULL
        GROUP BY player_id
        ORDER BY span_days DESC
        LIMIT ${limitParam}
      )
      SELECT
        s.player_id,
        s.span_days,
        s.first_date,
        s.last_date,
        COALESCE(first_t.tourney_name, '') AS first_tourney,
        COALESCE(last_t.tourney_name, '') AS last_tourney,
        COALESCE(p.atpname, p.player, '') AS name,
        p.ioc,
        p.slug
      FROM spans s
      JOIN "Player" p ON p.id = s.player_id
      LEFT JOIN LATERAL (
        SELECT tourney_name FROM "PlayerTournament"
        WHERE player_id = s.player_id
          AND round = ${roundParam}
          ${levelCond}
          ${surfaceCond}
        ORDER BY tourney_date ASC LIMIT 1
      ) first_t ON TRUE
      LEFT JOIN LATERAL (
        SELECT tourney_name FROM "PlayerTournament"
        WHERE player_id = s.player_id
          AND round = ${roundParam}
          ${levelCond}
          ${surfaceCond}
        ORDER BY tourney_date DESC LIMIT 1
      ) last_t ON TRUE
    `;

    const data = rows.map(r => ({
      id: r.player_id,
      name: r.name,
      ioc: r.ioc ?? '',
      firstTourney: r.first_tourney,
      firstDate: r.first_date instanceof Date
        ? r.first_date.toISOString().split('T')[0]
        : String(r.first_date).slice(0, 10),
      lastTourney: r.last_tourney,
      lastDate: r.last_date instanceof Date
        ? r.last_date.toISOString().split('T')[0]
        : String(r.last_date).slice(0, 10),
      spanDays: Number(r.span_days),
      slug: r.slug ?? null,
    }));

    return NextResponse.json({ data, round: roundParam });
  } catch (error) {
    console.error("Error fetching player tournament timespan:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
