import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const url = new URL(request.url);
    const section = url.searchParams.get("section");

    // Ottieni tutte le partite del torneo
    const matches = await prisma.match.findMany({
      where: { tourney_id: id },
      select: {
        year: true,
        round: true,
        surface: true,
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        loser_id: true,
        loser_name: true,
        loser_ioc: true,
        score: true,
        status: true,
      },
    });

    // Helpers
    const sortDesc = (a: any, b: any) => b.count - a.count;

    const top10 = <T extends { count: number }>(arr: T[]): T[] => {
      let result: T[] = [];
      let last = -1;

      for (const item of arr.sort(sortDesc)) {
        if (result.length < 10 || item.count === last) {
          result.push(item);
          last = item.count;
        } else break;
      }
      return result;
    };

    // Calcolo sezioni
    const compute = {
      titles: () => {
        const finals = matches.filter(
          (m) => m.round === "F" || m.round === "Final"
        );

        const map = new Map<string, any>();
        for (const m of finals) {
          if (!m.winner_id) continue;
          const key = String(m.winner_id);

          map.set(key, {
            id: m.winner_id,
            name: m.winner_name,
            ioc: m.winner_ioc ?? "",
            count: (map.get(key)?.count ?? 0) + 1,
          });
        }
        return [...map.values()].sort(sortDesc);
      },

      wins: () => {
        const map = new Map<string, any>();
        for (const m of matches) {
          if (!m.status || !m.winner_id) continue;
          const key = String(m.winner_id);

          map.set(key, {
            id: m.winner_id,
            name: m.winner_name,
            ioc: m.winner_ioc ?? "",
            count: (map.get(key)?.count ?? 0) + 1,
          });
        }
        return [...map.values()].sort(sortDesc);
      },

      played: () => {
        const map = new Map<string, any>();

        for (const m of matches) {
          if (!m.status) continue;

          const add = (id: any, name: any, ioc: any) => {
            const key = String(id);
            map.set(key, {
              id,
              name,
              ioc: ioc ?? "",
              count: (map.get(key)?.count ?? 0) + 1,
            });
          };

          if (m.winner_id) add(m.winner_id, m.winner_name, m.winner_ioc);
          if (m.loser_id) add(m.loser_id, m.loser_name, m.loser_ioc);
        }

        return [...map.values()].sort(sortDesc);
      },

      entries: () => {
        const map = new Map<string, any>();

        for (const m of matches) {
          if (!m.year) continue;

          const add = (id: any, name: any, ioc: any) => {
            const key = String(id);
            const prev = map.get(key);

            if (!prev) {
              map.set(key, {
                id,
                name,
                ioc: ioc ?? "",
                years: new Set([m.year]),
              });
            } else {
              prev.years.add(m.year);
            }
          };

          if (m.winner_id) add(m.winner_id, m.winner_name, m.winner_ioc);
          if (m.loser_id) add(m.loser_id, m.loser_name, m.loser_ioc);
        }

        return [...map.values()]
          .map((x) => ({ ...x, count: x.years.size }))
          .sort(sortDesc);
      },
    };

    // Richiesta full section? (Modal)
    if (section) {
      if (!["titles", "wins", "played", "entries"].includes(section)) {
        return NextResponse.json(
          { error: "Invalid section" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        section,
        fullList: compute[section](),
      });
    }

    // Overview: SOLO top10
    const overview = {
      titles: top10(compute.titles()),
      wins: top10(compute.wins()),
      played: top10(compute.played()),
      entries: top10(compute.entries()),
    };

    return NextResponse.json(overview);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
