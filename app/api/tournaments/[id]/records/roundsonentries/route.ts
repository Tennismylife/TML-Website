import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, context: any) {
  try {
    // support both Next.js versions where params can be a Promise or an object
    const params = await context?.params;
    const id = String(params?.id ?? '');

    const tourneyIds = await (await import('@/lib/tournament')).resolveTourneyIds(id);
    if (!tourneyIds) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    const numericIdSet = new Set(tourneyIds.filter(s => /^\d+$/.test(s)).map(s => parseInt(s, 10))); // numeric ids for normalization (580/581)


    // Trova tutte le partite del torneo
    const tourneyIdFilters = tourneyIds.flatMap((tid: string) => [{ tourney_id: tid }, { tourney_id: { endsWith: `-${tid}` } }]);

    const tournamentMatches = await prisma.match.findMany({
      where: { OR: tourneyIdFilters },
      select: {
        year: true,
        event_id: true,
        round: true,
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        loser_id: true,
        loser_name: true,
        loser_ioc: true,
        tourney_date: true,
      },
      orderBy: { tourney_date: 'desc' },
    });

    // Filtra finali
    const finals = tournamentMatches.filter((m) => ["F", "W", "Final"].includes(m.round ?? ''));

    // Calcolo delle entries totali (eventi unici)
    // Raccogliamo gli event_id per ogni giocatore in modo da considerare
    // ogni singolo evento (es. Australian Open Jan e Dec dello stesso anno) separatamente.
    const playerEntries = new Map<string, {
      id: string | number;
      name: string;
      ioc: string;
      events: Set<string>;
      totalEntries: number;
    }>();

    for (const m of tournamentMatches) {
      const eventId = String((m as any).event_id ?? '');
      if (!eventId) continue;

      // Winner
      if (m.winner_id && m.winner_name) {
        const key = String(m.winner_id);
        const existing = playerEntries.get(key);
        if (!existing) {
          playerEntries.set(key, {
            id: m.winner_id,
            name: m.winner_name,
            ioc: m.winner_ioc ?? "",
            events: new Set([eventId]),
            totalEntries: 0,
          });
        } else {
          existing.events.add(eventId);
        }
      }

      // Loser
      if (m.loser_id && m.loser_name) {
        const key = String(m.loser_id);
        const existing = playerEntries.get(key);
        if (!existing) {
          playerEntries.set(key, {
            id: m.loser_id,
            name: m.loser_name,
            ioc: m.loser_ioc ?? "",
            events: new Set([eventId]),
            totalEntries: 0,
          });
        } else {
          existing.events.add(eventId);
        }
      }
    }

    // Totale entries (per event_id)
    for (const player of playerEntries.values()) {
      player.totalEntries = player.events.size;
    }

    // Calcolo reaches per round (una reach per event_id)
    // Per evitare di contare più match nello stesso evento come più reaches,
    // manteniamo un Set di event_id per giocatore per ciascun round e poi
    // usiamo la dimensione del set come numero di reaches.
    const roundEventSets = new Map<string, Map<string, Set<string>>>(); // round -> (playerId -> set(event_id))

    for (const m of tournamentMatches) {
      const round = m.round || "Unknown";
      if (["R128", "R64"].includes(round)) continue; // 🔥 Esclusione richiesta

      const eventId = String((m as any).event_id ?? '');
      if (!eventId) continue;

      if (!roundEventSets.has(round)) roundEventSets.set(round, new Map());
      const players = roundEventSets.get(round)!;

      // Winner
      if (m.winner_id && m.winner_name) {
        const key = String(m.winner_id);
        if (!players.has(key)) players.set(key, new Set());
        players.get(key)!.add(eventId);
      }

      // Loser
      if (m.loser_id && m.loser_name) {
        const key = String(m.loser_id);
        if (!players.has(key)) players.set(key, new Set());
        players.get(key)!.add(eventId);
      }
    }

    // Convert sets to stats objects
    const roundReaches = new Map<string, Map<string, {
      id: string | number;
      name: string;
      ioc: string;
      reaches: number;
      totalEntries: number;
      percentage: number;
    }>>();

    for (const [round, playersMap] of roundEventSets.entries()) {
      const playersStats = new Map<string, any>();
      for (const [pid, events] of playersMap.entries()) {
        const entry = playerEntries.get(pid);
        playersStats.set(pid, {
          id: pid,
          name: entry?.name ?? '',
          ioc: entry?.ioc ?? '',
          reaches: events.size,
          totalEntries: entry?.totalEntries || 0,
          percentage: 0,
        });
      }
      roundReaches.set(round, playersStats);
    }

    // Percentuali
    for (const players of roundReaches.values()) {
      for (const stats of players.values()) {
        stats.percentage = stats.totalEntries > 0 ? (stats.reaches / stats.totalEntries) * 100 : 0;
      }
    }

    // Calcolo Winner round
    const winnerStats = new Map<string, {
      id: string | number;
      name: string;
      ioc: string;
      reaches: number;
      totalEntries: number;
      percentage: number;
    }>();

    for (const m of finals) {
      if (m.winner_id && m.winner_name) {
        const key = String(m.winner_id);
        const existing = winnerStats.get(key);
        if (!existing) {
          const entry = playerEntries.get(key);
          winnerStats.set(key, {
            id: m.winner_id,
            name: m.winner_name,
            ioc: m.winner_ioc ?? "",
            reaches: 1,
            totalEntries: entry?.totalEntries || 0,
            percentage: 0,
          });
        } else {
          existing.reaches++;
        }
      }
    }

    for (const stats of winnerStats.values()) {
      stats.percentage = stats.totalEntries > 0 ? (stats.reaches / stats.totalEntries) * 100 : 0;
    }

    roundReaches.set("Winner", winnerStats);

    // Ordinamento round (esclusi R128 e R64)
    const roundOrder = ["W", "F", "SF", "QF", "R16", "R32"];
    const sortedRounds = Array.from(roundReaches.keys()).sort((a, b) => {
      const indexA = roundOrder.indexOf(a);
      const indexB = roundOrder.indexOf(b);
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });

    // Composizione finale
    const allRoundItems: any[] = [];

    // Winner per primo
    if (roundReaches.has("Winner")) {
      const winnerPlayers = roundReaches.get("Winner")!;
      const sorted = Array.from(winnerPlayers.values())
        .filter(p => p.totalEntries > 0)
        .sort((a, b) => b.percentage - a.percentage);
      allRoundItems.push({
        title: "Winner",
        list: sorted.slice(0, 10),
        fullList: sorted,
      });
    }

    // Altri round (senza R128 e R64)
    for (const round of sortedRounds.filter(r => !["Winner", "R128", "R64"].includes(r))) {
      const players = roundReaches.get(round)!;
      const sorted = Array.from(players.values())
        .filter(p => p.totalEntries > 0)
        .sort((a, b) => b.percentage - a.percentage);
      allRoundItems.push({
        title: round,
        list: sorted.slice(0, 10),
        fullList: sorted,
      });
    }

    // Enrich with slugs (best-effort)
    const ids = Array.from(new Set(allRoundItems.flatMap((r: any) => (r.list || []).map((it: any) => String(it.id)))));
    if (ids.length > 0) {
      const { mapIdsToSlugs } = await import('@/lib/player-slugs');
      const slugMap = await mapIdsToSlugs(ids);
      for (const r of allRoundItems) {
        if (Array.isArray(r.list)) {
          for (const it of r.list) {
            (it as any).slug = slugMap[String(it.id)] ?? null;
          }
        }
        if (Array.isArray(r.fullList)) {
          for (const it of r.fullList) {
            (it as any).slug = slugMap[String(it.id)] ?? null;
          }
        }
      }
    }

    return NextResponse.json({ allRoundItems });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
