import { prisma } from '@/lib/prisma';
import { resolveTourneyIds } from '@/lib/tournament';

function sortDesc(a: any, b: any) {
  return b.count - a.count;
}

function top10<T extends { count: number }>(arr: T[]): T[] {
  let result: T[] = [];
  let last = -1;

  for (const item of arr.sort(sortDesc)) {
    if (result.length < 10 || item.count === last) {
      result.push(item);
      last = item.count;
    } else break;
  }
  return result;
}

export async function getCountOverview(idOrSlug: string) {
  const tourneyIds = await resolveTourneyIds(idOrSlug);
  if (!tourneyIds) throw new Error('Tournament not found');

  const matches = await prisma.match.findMany({
    where: { tourney_id: { in: tourneyIds } },
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

  const compute = {
    titles: () => {
      const finals = matches.filter((m) => m.round === 'F' || m.round === 'Final');
      const map = new Map<string, any>();
      for (const m of finals) {
        if (!m.winner_id) continue;
        const key = String(m.winner_id);
        map.set(key, {
          id: m.winner_id,
          name: m.winner_name,
          ioc: m.winner_ioc ?? '',
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
          ioc: m.winner_ioc ?? '',
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
            ioc: ioc ?? '',
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
              ioc: ioc ?? '',
              years: new Set([m.year]),
            });
          } else {
            prev.years.add(m.year);
          }
        };
        if (m.winner_id) add(m.winner_id, m.winner_name, m.winner_ioc);
        if (m.loser_id) add(m.loser_id, m.loser_name, m.loser_ioc);
      }
      return [...map.values()].map((x) => ({ ...x, count: x.years.size })).sort(sortDesc);
    },
  };

  // Enrich overview with slugs (best-effort)
  const overview = {
    titles: top10(compute.titles()),
    wins: top10(compute.wins()),
    played: top10(compute.played()),
    entries: top10(compute.entries()),
  };

  try {
    const ids = Array.from(new Set(Object.values(overview).flatMap((arr: any[]) => arr.map(a => String(a.id)))));
    if (ids.length > 0) {
      const { mapIdsToSlugs } = await import('@/lib/player-slugs');
      const slugMap = await mapIdsToSlugs(ids);
      for (const sectionArr of Object.values(overview)) {
        for (const it of sectionArr as any[]) {
          (it as any).slug = slugMap[String(it.id)] ?? null;
        }
      }
    }
  } catch (e) {
    // non-fatal
  }

  return overview;
}

export async function getCountSection(idOrSlug: string, section: 'titles' | 'wins' | 'played' | 'entries') {
  const tourneyIds = await resolveTourneyIds(idOrSlug);
  if (!tourneyIds) throw new Error('Tournament not found');

  const matches = await prisma.match.findMany({
    where: { tourney_id: { in: tourneyIds } },
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

  const compute = {
    titles: () => {
      const finals = matches.filter((m) => m.round === 'F' || m.round === 'Final');
      const map = new Map<string, any>();
      for (const m of finals) {
        if (!m.winner_id) continue;
        const key = String(m.winner_id);
        map.set(key, {
          id: m.winner_id,
          name: m.winner_name,
          ioc: m.winner_ioc ?? '',
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
          ioc: m.winner_ioc ?? '',
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
            ioc: ioc ?? '',
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
              ioc: ioc ?? '',
              years: new Set([m.year]),
            });
          } else {
            prev.years.add(m.year);
          }
        };
        if (m.winner_id) add(m.winner_id, m.winner_name, m.winner_ioc);
        if (m.loser_id) add(m.loser_id, m.loser_name, m.loser_ioc);
      }
      return [...map.values()].map((x) => ({ ...x, count: x.years.size })).sort(sortDesc);
    },
  };

  const result = compute[section]();

  // Enrich with slugs (best-effort)
  try {
    const ids = Array.from(new Set((result || []).map((it: any) => String(it.id))));
    if (ids.length > 0) {
      const { mapIdsToSlugs } = await import('@/lib/player-slugs');
      const slugMap = await mapIdsToSlugs(ids);
      for (const it of result) {
        (it as any).slug = slugMap[String(it.id)] ?? null;
      }
    }
  } catch (e) {
    // ignore failures
  }

  return result;
}
