import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// converte numerico in XXy YYd
function formatAge(age: number) {
  const years = Math.floor(age);
  const days = Math.round((age - years) * 365);
  return `${years}y ${days}d`;
}

// ritorna l’età alla quale la somma cumulativa delle partecipazioni >= n
// Supporta sia mappe cumulative (valore = cumulative count) sia istogrammi per-età
function getAgeForNthEntry(ageCounts: Record<string, number>, n: number): number | null {
  const entries = Object.entries(ageCounts)
    .map(([age, cnt]) => [parseFloat(age), Number(cnt) || 0] as [number, number])
    .sort((a, b) => a[0] - b[0]); // crescente per età

  let running = 0;
  for (const [age, cnt] of entries) {
    // If the source already contains cumulative values (non-decreasing),
    // treat the entry as "cumulative" by ensuring running <= cnt; otherwise
    // add cnt to running (histogram behaviour).
    if (cnt >= running) {
      // Heuristic: if cnt is >= previous running, consider `cnt` cumulative
      // and set running = cnt; otherwise treat as per-age count and add.
      running = cnt >= running ? cnt : running + cnt;
    } else {
      // fallback: add as per-age count
      running += cnt;
    }

    if (running >= n) return age;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const n = Number(url.searchParams.get("n"));
    if (!Number.isInteger(n) || n <= 0) {
      return NextResponse.json({ error: "Invalid n parameter" }, { status: 400 });
    }

    const limitParam = Number(url.searchParams.get("limit"));
    const limit = Number.isInteger(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 100;

    const getFiltered = (k: string) => url.searchParams.getAll(k).filter(Boolean);
    const selectedSurfaces = getFiltered("surface");
    const selectedLevels = getFiltered("level");

    const filtersCount = [selectedSurfaces.length > 0, selectedLevels.length > 0].filter(Boolean).length;

    // use runtime db reference so tests can mock globalThis.prisma
    const db = (globalThis as any).prisma || prisma;

    // ===== CASE 1: 0 o 1 filtro → usa MV =====
    if (filtersCount <= 1) {
      const data = await db.mVEntriesAges.findMany({
        select: {
          player_id: true,
          ages_json: true,
          ages_by_surface_json: true,
          ages_by_level_json: true,
        },
      });

      // If caller requested a level filter but the materialized view does not
      // contain any per-level data for that level, fall back to the dynamic
      // match-based computation to ensure correct filtered results.
      if (selectedLevels.length === 1) {
        const levelKey = selectedLevels[0];
        // DEBUG: log MV shape when running tests that exercise level-based logic
        try { /* eslint-disable no-console */ console.debug('[entries.route] mv rows', Array.isArray(data) ? data.length : String(data)); } catch (e) {}
        const hasPerLevel = Array.isArray(data) && data.some(d => {
          try {
            return d && d.ages_by_level_json && d.ages_by_level_json[levelKey] && Object.keys(d.ages_by_level_json[levelKey] || {}).length > 0;
          } catch (e) { return false; }
        });
        if (!hasPerLevel) {
          // fallback: perform dynamic computation same as CASE 2
          const where: any = {
            ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
            ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
          };

          // Reuse dynamic path: collect ages per player from matches and pick nth element
          const matches = await db.match.findMany({
            where,
            select: { winner_id: true, loser_id: true, winner_age: true, loser_age: true, event_id: true, surface: true, tourney_level: true },
            orderBy: { event_id: 'asc' },
          });

          if (!matches.length) return NextResponse.json([]);

          const map = new Map<string, number[]>();
          const seen = new Set<string>();

          for (const m of matches) {
            for (const [playerId, age] of [
              [m.winner_id, m.winner_age],
              [m.loser_id, m.loser_age],
            ]) {
              if (!playerId || age == null) continue;
              if (selectedSurfaces.length && !selectedSurfaces.includes(m.surface || 'Unknown')) continue;
              if (selectedLevels.length && !selectedLevels.includes(m.tourney_level || 'Unknown')) continue;

              const key = `${playerId}-${m.event_id}`;
              if (seen.has(key)) continue;
              seen.add(key);

              const pid = String(playerId);
              if (!map.has(pid)) map.set(pid, []);
              map.get(pid)!.push(Number(age));
            }
          }

          const resultAges: Map<string, number | null> = new Map();
          for (const [id, ages] of map) {
            ages.sort((a, b) => a - b);
            resultAges.set(id, ages.length >= n ? ages[n - 1] : null);
          }

          const playerIds = [...resultAges.keys()];
          const playersInfo = await db.player.findMany({ where: { id: { in: playerIds } }, select: { id: true, player: true, ioc: true, slug: true } });

          const finalResult = playersInfo
            .map((p) => {
              const age = resultAges.get(String(p.id));
              if (age == null) return null;
              return {
                id: String(p.id),
                name: p.player,
                ioc: p.ioc || '',
                age_at_entry: formatAge(age),
                numeric_age: age,
                slug: p.slug || null,
              };
            })
            .filter((x): x is any => x != null)
            .sort((a, b) => a.numeric_age - b.numeric_age)
            .slice(0, limit)
            .map(({ numeric_age, ...rest }) => rest);

          return NextResponse.json(finalResult);
        }
      }

      const players = await db.player.findMany({
        where: { id: { in: data.map((d) => d.player_id) } },
        select: { id: true, player: true, ioc: true, slug: true },
      });

      const dataMap = Object.fromEntries(data.map((d) => [d.player_id, d]));

      const result = players
        .map((p) => {
          const d = dataMap[p.id];
          if (!d) return null;

          let selectedAges: Record<string, number> = d.ages_json as any;

          if (selectedSurfaces.length === 1) {
            selectedAges = (d.ages_by_surface_json as any)?.[selectedSurfaces[0]] ?? {};
          } else if (selectedLevels.length === 1) {
            selectedAges = (d.ages_by_level_json as any)?.[selectedLevels[0]] ?? {};
          }

          const ageNum = getAgeForNthEntry(selectedAges, n);
          if (ageNum == null) return null;

          return {
            id: String(p.id),
            name: p.player,
            ioc: p.ioc || "",
            age_at_entry: formatAge(ageNum),
            numeric_age: ageNum,
          };
        })
        .filter((x): x is { id: string; name: string; ioc: string; age_at_entry: string; numeric_age: number } => x != null)
        .sort((a, b) => a.numeric_age - b.numeric_age)
        .slice(0, limit)
        .map(({ numeric_age, ...rest }) => rest);

      // Attach slugs when available
      const ids = result.map(r => String(r.id));
      if (ids.length > 0) {
        const rows = await db.player.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } });
        const slugMap = Object.fromEntries(rows.map(r => [r.id, r.slug]));
        const enriched = result.map(r => ({ ...r, slug: slugMap[String(r.id)] ?? null }));
        return NextResponse.json(enriched);
      }

      return NextResponse.json(result);
    }

    // ===== CASE 2: 2+ filtri → calcolo dinamico =====
    const where: any = {
      ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
      ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
    };

    const matches = await db.match.findMany({
      where,
      select: { winner_id: true, loser_id: true, winner_age: true, loser_age: true, event_id: true, surface: true, tourney_level: true },
      orderBy: { event_id: "asc" },
    });

    if (!matches.length) return NextResponse.json([]);

    const map = new Map<string, number[]>();
    const seen = new Set<string>();

    for (const m of matches) {
      for (const [playerId, age] of [
        [m.winner_id, m.winner_age],
        [m.loser_id, m.loser_age],
      ]) {
        if (!playerId || age == null) continue;
        if (selectedSurfaces.length && !selectedSurfaces.includes(m.surface || "Unknown")) continue;
        if (selectedLevels.length && !selectedLevels.includes(m.tourney_level || "Unknown")) continue;

        const key = `${playerId}-${m.event_id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const pid = String(playerId);
        if (!map.has(pid)) map.set(pid, []);
        map.get(pid)!.push(Number(age));
      }
    }

    const resultAges: Map<string, number | null> = new Map();
    for (const [id, ages] of map) {
      ages.sort((a, b) => a - b);
      resultAges.set(id, ages.length >= n ? ages[n - 1] : null);
    }

    const playerIds = [...resultAges.keys()];
    const playersInfo = await db.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, player: true, ioc: true },
    });

    const finalResult = playersInfo
      .map((p) => {
        const age = resultAges.get(String(p.id));
        if (age == null) return null;
        return {
          id: String(p.id),
          name: p.player,
          ioc: p.ioc || "",
          age_at_entry: formatAge(age),
          numeric_age: age,
        };
      })
      .filter((x): x is { id: string; name: string; ioc: string; age_at_entry: string; numeric_age: number } => x != null)
      .sort((a, b) => a.numeric_age - b.numeric_age)
      .slice(0, limit)
      .map(({ numeric_age, ...rest }) => rest);

    // Attach slugs when available
    const ids = finalResult.map(r => String(r.id));
    if (ids.length > 0) {
      const rows = await db.player.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } });
      const slugMap = Object.fromEntries(rows.map(r => [r.id, r.slug]));
      const enriched = finalResult.map(r => ({ ...r, slug: slugMap[String(r.id)] ?? null }));
      return NextResponse.json(enriched);
    }

    return NextResponse.json(finalResult);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
