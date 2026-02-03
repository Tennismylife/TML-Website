
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const NOT_PLAYED_REGEX = /\b(W\/O|DEF|WEA|WALKOVER)\b/;

function parseGamesLostByWinner(score: string): number {
  if (!score) return 0;
  const s = score.toUpperCase();

  // Match non disputato: nessun game perso conta
  if (NOT_PLAYED_REGEX.test(s)) return 0;

  const tokens = s.split(/\s+/);
  let total = 0;

  for (const t of tokens) {
    // Se compaiono token non-set (RET, BYE, ecc.), fermo il parsing
    if (/^(RET|INJ|CANC|SUSP|BYE|ABN|NS|NR|UNK|N\/A)$/i.test(t)) break;

    // Rimuove contenuti tra parentesi (tiebreak/supertiebreak, es. 7-6(4), (10))
    const cleaned = t.replace(/\([^)]*\)/g, '');

    const m = cleaned.match(/^(\d+)-(\d+)$/);
    if (!m) continue;

    const lost = parseInt(m[2], 10);
    if (!Number.isNaN(lost)) total += lost;
  }

  return total;
}

export async function GET(request: NextRequest, context: any) {
  try {
    // Supporto compat per Next (params oggetto o Promise)
    const params = await context?.params;
    const id = String(params?.id ?? '');

    // request.url may be an absolute URL or a relative path depending on how fetch was called;
    // prefer using NextRequest.nextUrl when available, otherwise construct a URL with a dummy base
    const searchParams = (request as any).nextUrl?.searchParams ?? (new URL(request.url, 'http://localhost')).searchParams;
    const full = searchParams.get('full') === 'true';
    const specificRound = searchParams.get('round'); // opzionale: 'R32'|'R16'|'QF'|'SF'|'F'|'W'

    const tourneyIds = await (await import('@/lib/tournament')).resolveTourneyIds(id);
    if (!tourneyIds) return Response.json({ error: 'Tournament not found' }, { status: 404 });
    const numericIdSet = new Set(tourneyIds.filter(s => /^\d+$/.test(s)).map(s => parseInt(s, 10))); // numeric ids for normalization (580/581)


    // Carico tutti i match del torneo (multi-anno)
    const tourneyIdFilters = tourneyIds.flatMap((tid: string) => [{ tourney_id: tid }, { tourney_id: { endsWith: `-${tid}` } }]);

    const tournamentMatches = await prisma.match.findMany({
      where: { OR: tourneyIdFilters },
      select: {
        year: true,
        tourney_id: true,
        tourney_name: true,
        tourney_date: true,
        round: true,
        surface: true,
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        winner_age: true,
        loser_id: true,
        loser_name: true,
        loser_ioc: true,
        loser_age: true,
        score: true,
        draw_size: true,
      },
      orderBy: { year: 'desc' },
    });

    // Ordine completo per il calcolo (includo R128/R64)
    const fullRoundOrder = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F', 'W'] as const;
    const roundIndexMap = new Map(fullRoundOrder.map((r, i) => [r, i]));

    // Turni da esporre nel plot/tabella
    const exposedRounds = ['R32', 'R16', 'QF', 'SF', 'F', 'W'] as const;

    // Raggruppo per anno
    const matchesByYear = new Map<number, any[]>();
    for (const m of tournamentMatches) {
      const year = m.year;
      if (!year) continue;
      if (!matchesByYear.has(year)) matchesByYear.set(year, []);
      matchesByYear.get(year)!.push(m);
    }

    type PlayerInfo = {
      id: string | number;
      name: string;
      ioc: string;
      highestIdx: number; // indice nel fullRoundOrder (con F→W per il vincitore)
    };

    type RoundItemData = {
      year: number;
      minGamesLost: number; // ⚠️ per compatibilità: contiene la somma per quel giocatore
      player: { id: string | number; name: string; ioc: string };
      tourney_id?: string | number;
    };

    const roundItems: { round: string; data: RoundItemData[] }[] = exposedRounds.map((round) => ({
      round,
      data: [],
    }));

    // Process per anno
    for (const [year, matches] of matchesByYear) {
      // 1) Mappa il round più alto raggiunto per ogni giocatore
      const players = new Map<string, PlayerInfo>();

      for (const m of matches) {
        const round = m.round || 'Unknown';
        if (!roundIndexMap.has(round)) continue;
        const idx = roundIndexMap.get(round)!;

        // Winner: se vince la finale, promuovo a W (indice > F)
        if (m.winner_id && m.winner_name) {
          const key = String(m.winner_id);
          const highestIdx = (round === 'F') ? roundIndexMap.get('W')! : idx;
          const existing = players.get(key);
          if (!existing || highestIdx > existing.highestIdx) {
            players.set(key, {
              id: m.winner_id,
              name: m.winner_name,
              ioc: m.winner_ioc ?? '',
              highestIdx,
            });
          }
        }

        // Loser: highest = round in cui ha perso (escludo match non giocati)
        if (m.loser_id && m.loser_name && !NOT_PLAYED_REGEX.test((m.score ?? '').toUpperCase())) {
          const key = String(m.loser_id);
          const existing = players.get(key);
          if (!existing || idx > existing.highestIdx) {
            players.set(key, {
              id: m.loser_id,
              name: m.loser_name,
              ioc: m.loser_ioc ?? '',
              highestIdx: idx,
            });
          }
        }
      }

      // 2) Somma dei game persi NEI MATCH VINTI per ciascun giocatore, per round
      //    (lo score è dal punto di vista del vincitore: sommiamo dove il player ha vinto)
      const gamesLostPerPlayerByIdx = new Map<string, Map<number, number>>();
      for (const m of matches) {
        const wid = m.winner_id;
        if (!wid) continue;

        const round = m.round || 'Unknown';
        const idx = roundIndexMap.get(round);
        if (idx === undefined) continue;

        if (NOT_PLAYED_REGEX.test((m.score ?? '').toUpperCase())) continue;

        const lost = parseGamesLostByWinner(m.score);
        const key = String(wid);
        if (!gamesLostPerPlayerByIdx.has(key)) gamesLostPerPlayerByIdx.set(key, new Map());
        const perIdx = gamesLostPerPlayerByIdx.get(key)!;
        perIdx.set(idx, (perIdx.get(idx) ?? 0) + lost);
      }

      // 3) Arrivi per round esposto (R32..F): giocatori con highest == quel round
      for (const R of exposedRounds) {
        const targetIdx = roundIndexMap.get(R)!;

        if (R !== 'W') {
          const arrivals = Array.from(players.values()).filter(p => p.highestIdx === targetIdx);
          if (arrivals.length === 0) continue;

          for (const p of arrivals) {
            const perIdx = gamesLostPerPlayerByIdx.get(String(p.id)) || new Map<number, number>();

            // Somma dei round precedenti al target (per arrivare a R)
            let sum = 0;
            for (const [idx, lost] of perIdx.entries()) {
              if (idx < targetIdx) sum += lost;
            }

            // try to find the match that identifies this player's arrival (loser at round R)
            const matchForPlayer = matches.find((mm: any) => String(mm.loser_id) === String(p.id) && mm.round === R) || null;
            let origNumericTourney: string | undefined = undefined;
            if (matchForPlayer && matchForPlayer.tourney_id) {
              const parts = String(matchForPlayer.tourney_id).split('-');
              origNumericTourney = parts[parts.length - 1];
            }

            const bucket = roundItems.find(x => x.round === R)!;
            bucket.data.push({
              year,
              minGamesLost: sum, // compat: ora è la somma per quel giocatore
              player: { id: p.id, name: p.name, ioc: p.ioc },
              tourney_id: origNumericTourney,
            });
          }
        } else {
          // 4) W: inserisco solo il vincitore (highest == W), con totale (fino alla finale inclusa)
          const winner = Array.from(players.values()).find(p => p.highestIdx === roundIndexMap.get('W')!);
          if (winner) {
            const perIdx = gamesLostPerPlayerByIdx.get(String(winner.id)) || new Map<number, number>();
            const fIdx = roundIndexMap.get('F')!;
            let totalToWin = 0;
            for (const [idx, lost] of perIdx.entries()) {
              if (idx <= fIdx) totalToWin += lost;
            }

            const bucketW = roundItems.find(x => x.round === 'W')!;
            // find final match to obtain tourney id
            const finalMatch = matches.find((mm: any) => mm.round === 'F' && String(mm.winner_id) === String(winner.id)) || null;
            let finalNumericTourney: string | undefined = undefined;
            if (finalMatch && finalMatch.tourney_id) {
              const parts = String(finalMatch.tourney_id).split('-');
              finalNumericTourney = parts[parts.length - 1];
            }
            bucketW.data.push({
              year,
              minGamesLost: totalToWin, // compat: totale per vincere
              player: { id: winner.id, name: winner.name, ioc: winner.ioc },
              tourney_id: finalNumericTourney,
            });
          }
        }
      }
    }

    // ORDINA per game persi in modo crescente (con tie-break deterministico: anno, nome)
    for (const item of roundItems) {
      item.data.sort((a, b) => {
        if (a.minGamesLost !== b.minGamesLost) {
          return a.minGamesLost - b.minGamesLost; // ASC per game persi
        }
        if (a.year !== b.year) return a.year - b.year; // tie-break 1: anno ASC
        return a.player.name.localeCompare(b.player.name); // tie-break 2: nome
      });
    }

    // Limita a 10 risultati di default (dopo il sort ASC)
    if (!full) {
      for (const item of roundItems) {
        item.data = item.data.slice(0, 10);
      }
    }

    // Se richiesto, ritorno solo un round
    if (specificRound) {
      const found = roundItems.find(r => r.round === specificRound);

      // Enrich with slugs (best-effort) for the specific round
      if (found) {
        const ids = Array.from(new Set(found.data.map((d: any) => String(d.player?.id))));
        if (ids.length > 0) {
          const { mapIdsToSlugs } = await import('@/lib/player-slugs');
          const slugMap = await mapIdsToSlugs(ids);
          for (const d of found.data) {
            if (d.player) (d.player as any).slug = slugMap[String((d.player as any).id)] ?? null;
          }
        }
      }

      return NextResponse.json({ roundItems: found ? [found] : [] });
    }

    // Enrich with slugs (best-effort)
    const allIds = Array.from(new Set(roundItems.flatMap(r => r.data.map((d: any) => String(d.player?.id)))));
    if (allIds.length > 0) {
      const { mapIdsToSlugs } = await import('@/lib/player-slugs');
      const slugMap = await mapIdsToSlugs(allIds);
      for (const r of roundItems) {
        for (const d of r.data) {
          if (d.player) (d.player as any).slug = slugMap[String((d.player as any).id)] ?? null;
        }
      }
    }

    return NextResponse.json({ roundItems });
  } catch (error) {
       console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}