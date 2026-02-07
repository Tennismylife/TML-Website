import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSlug } from "@/lib/utils";

export async function GET(request: Request, context: { params: Promise<{ year: string }> }) {
  try {
    // await params (required in app router when route is async/client-aware)
    const p = await context.params;
    const yearRaw = String(p?.year ?? "");
    const year = parseInt(yearRaw, 10);
    if (isNaN(year)) {
      return NextResponse.json({ error: "Invalid year parameter" }, { status: 400 });
    }

    // Recupera i match di quell’anno escludendo solo i tornei di livello 'D' (Davis Cup)
    const matches = await prisma.match.findMany({
      where: {
        year: year,
        NOT: { tourney_level: "D" },
      },
      select: {
        id: true,
        tourney_id: true,
        tourney_name: true,
        tourney_date: true,
        year: true,
        round: true,
        score: true,
        tourney_level: true,
        surface: true,
        draw_size: true,
        winner_id: true,
        loser_id: true,
        winner_name: true,
        loser_name: true,
        winner_ioc: true,
        loser_ioc: true,
      },
      orderBy: [{ tourney_date: "asc" }, { tourney_name: "asc" }],
    });

    type Match = (typeof matches)[number];
    const tourneyMap = new Map<string, Match[]>();

    // Raggruppa i match per torneo (senza più filtri “fuffa”)
    for (const m of matches) {
      if (!m.tourney_name) continue;
      // Group tournaments by name + season year (use match.year, not tourney_date)
      const key = `${m.tourney_name}__${(m as any).year ?? "unknown"}`;
      if (!tourneyMap.has(key)) tourneyMap.set(key, []);
      tourneyMap.get(key)!.push(m);
    }

    // Costruisci i "TourneyTile"
    const tourneys = Array.from(tourneyMap.entries()).map(([key, arr]) => {
      const rep = arr[0];
      const finalMatch = arr.find(m => m.round === "F");

      // Compute the tournament start date as the earliest tourney_date among matches in the group
      const dateTsArr = arr
        .map((m) => (m.tourney_date ? new Date(m.tourney_date).getTime() : 0))
        .filter(Boolean);
      const startTs = dateTsArr.length ? Math.min(...dateTsArr) : (rep.tourney_date ? new Date(rep.tourney_date).getTime() : 0);
      const startDate = startTs ? new Date(startTs) : rep.tourney_date;

      return {
        key,
        name: rep.tourney_name ?? "Unknown",
        date: startDate,
        year: (rep as any).year ?? null,
        surface: rep.surface ?? null,
        level: rep.tourney_level ?? null,
        matches: arr.length,
        hasFinal: Boolean(finalMatch),
        winner: finalMatch?.winner_name ?? "Unknown",
        loser: finalMatch?.loser_name ?? "Unknown",
        score: finalMatch?.score ?? "-",
        tourney_id: rep.tourney_id,
        extractedId: rep.tourney_id ? (String(rep.tourney_id).split("-").pop() ?? String(rep.tourney_id)) : '',
        winner_ioc: finalMatch?.winner_ioc ?? "",
        loser_ioc: finalMatch?.loser_ioc ?? "",
        draw_size: rep.draw_size ?? 0,
      };
    });

    // Enrich with canonical slug when available (robust: numeric id parsing + slug/name fallback)
    const tourneyIdsRaw = Array.from(new Set(tourneys.map((t) => t.tourney_id).filter(Boolean)));

    // Build numeric id candidates and slug candidates (from tournament name)
    const numericIdsSet = new Set<number>();
    const slugCandidatesSet = new Set<string>();
    for (const t of tourneys) {
      if (t.tourney_id) {
        const s = String(t.tourney_id);
        const parts = s.split("-");
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          if (!p) continue;
          const n = Number(p);
          if (Number.isFinite(n)) {
            numericIdsSet.add(n);
            break;
          }
        }
      }
      const cand = createSlug(t.name);
      if (cand) slugCandidatesSet.add(cand);
    }

    // Build a flexible WHERE clause and fetch matching tournaments (safe: try/catch)
    const whereOr: any[] = [];
    if (numericIdsSet.size) whereOr.push({ id: { in: Array.from(numericIdsSet) } });
    if (slugCandidatesSet.size) whereOr.push({ slug: { in: Array.from(slugCandidatesSet) } });

    let dbTournaments: Array<{ id: number; slug: string }> = [];
    if (whereOr.length) {
      try {
        dbTournaments = await prisma.tournament.findMany({
          where: { OR: whereOr },
          select: { id: true, slug: true },
        });
      } catch (err) {
        console.error("Error fetching tournament slugs:", err);
        dbTournaments = [];
      }
    }

    const slugMapById = new Map(dbTournaments.map((d) => [String(d.id), d.slug]));
    const slugSet = new Set(dbTournaments.map((d) => d.slug));

    tourneys.forEach((t) => {
      let found: string | null = null;
      // Prefer matching by numeric id (try last segment)
      if (t.tourney_id) {
        const s = String(t.tourney_id);
        const parts = s.split("-");
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          if (!p) continue;
          const n = Number(p);
          if (Number.isFinite(n) && slugMapById.has(String(n))) {
            found = slugMapById.get(String(n)) ?? null;
            break;
          }
        }
      }
      // Fallback: match by slug candidate derived from name
      if (!found) {
        const cand = createSlug(t.name);
        if (cand && slugSet.has(cand)) found = cand;
      }
      (t as any).slug = found ?? null;
    });

    // Ordina i tornei per data (più vecchio -> più recente), poi per nome
    tourneys.sort((a, b) => {
      const ad = new Date(a.date ?? 0).getTime();
      const bd = new Date(b.date ?? 0).getTime();
      const diff = ad - bd;
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });

    return NextResponse.json(tourneys);
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
