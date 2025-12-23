
// app/api/tournaments-played/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';


const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Tipi per la MV
type TitlesEntry = { titles: number; played: number };
type OverallJson = TitlesEntry[];
type SurfaceJson = Record<string, TitlesEntry[]>;
type LevelJson = Record<string, TitlesEntry[]>;

// Helpers per MV
function idxByTitles(arr: OverallJson | TitlesEntry[] | undefined, maxTitles: number): number {
  if (!arr || !Array.isArray(arr)) return -1;
  return arr.findIndex((t) => Number(t?.titles) === maxTitles);
}
function sumPlayedFromKeys<T extends Record<string, TitlesEntry[]>>(
  obj: T | undefined,
  keys: string[],
  idx: number
): number {
  if (!obj || idx < 0) return 0;
  let sum = 0;
  for (const k of keys) {
    const row = obj[k]?.[idx];
    sum += Number(row?.played) || 0;
  }
  return sum;
}

// Ordine su Date
function toMillis(d: Date | null | undefined): number {
  return d ? d.getTime() : Number.MAX_SAFE_INTEGER;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    const selectedSurfaces = url.searchParams.getAll('surface').filter(Boolean);
    const selectedLevels   = url.searchParams.getAll('level').filter(Boolean); // param resta "level" in query
    const maxTitlesParam   = url.searchParams.get('maxTitles');
    const maxTitles        = maxTitlesParam !== null ? parseInt(maxTitlesParam, 10) : NaN;

    if (Number.isNaN(maxTitles)) {
      return NextResponse.json({ error: 'Parametro "maxTitles" mancante o non numerico' }, { status: 400 });
    }

    const limitParam = url.searchParams.get('limit');
    const orderParam = (url.searchParams.get('order') || 'asc').toLowerCase(); // 'asc' | 'desc'
    const limit      = limitParam ? Math.max(1, Math.min(1000, parseInt(limitParam, 10) || 100)) : 100;
    const orderAsc   = orderParam !== 'desc';

    // =========================================================
    // Branch: entrambi i filtri -> calcolo progressivo con Prisma su PlayerTournament
    // =========================================================
    if (selectedSurfaces.length > 0 && selectedLevels.length > 0) {
      const baseWhere = {
        surface: { in: selectedSurfaces },
        tourney_level: { in: selectedLevels }, // campo corretto
      } as const;

      // 1) Tornei vinti (round='W'), una entry per (player_id, event_id)
      const wonGroups = await prisma.playerTournament.groupBy({
        where: { ...baseWhere, round: 'W' },
        by: ['player_id', 'event_id'],
        _count: { _all: true }, // una riga per coppia unica
      });

      // Costruisco: set dei tornei vinti per player (chiave pid#event_id) + conteggio titoli per player
      const winKey = (pid: string, eid: string) => `${pid}#${eid}`;
      const winnersSet = new Set<string>();
      const playerTitlesCount = new Map<string, number>();
      for (const g of wonGroups) {
        const pid = String(g.player_id);
        const eid = String(g.event_id);
        winnersSet.add(winKey(pid, eid));
        playerTitlesCount.set(pid, (playerTitlesCount.get(pid) ?? 0) + 1);
      }

      // Id "candidati": hanno almeno maxTitles vittorie nei filtri
      const eligibleIds = Array.from(playerTitlesCount.entries())
        .filter(([, c]) => c >= maxTitles)
        .map(([pid]) => pid);

      if (eligibleIds.length === 0) {
        return NextResponse.json([]);
      }

      // 2) Tutti i tornei giocati (dedup su player_id+event_id) con data minima per ordinamento
      const playedGroups = await prisma.playerTournament.groupBy({
        where: { ...baseWhere, player_id: { in: eligibleIds } },
        by: ['player_id', 'event_id'],
        _min: { tourney_date: true }, // DateTime per ordinare cronologicamente
      });

      // 3) Per ogni player, ordina i tornei (per _min.tourney_date) e conta coppie uniche (event_id, player_id)
      type Entry = { event_id: string; date: Date | null; isWin: boolean };
      const perPlayer = new Map<string, Entry[]>();

      for (const g of playedGroups) {
        const pid = String(g.player_id);
        const eid = String(g.event_id);
        const arr = perPlayer.get(pid) ?? [];
        arr.push({
          event_id: eid,
          date: (g._min?.tourney_date ?? null) as Date | null,
          isWin: winnersSet.has(winKey(pid, eid)), // vittoria titolo per quella coppia
        });
        perPlayer.set(pid, arr);
      }

      const minimalToReach: { player_id: string; tournaments_played: number; titles: number }[] = [];

      for (const [pid, arr] of perPlayer.entries()) {
        // Ordina cronologicamente (tie-break alfabetico su event_id)
        arr.sort((a, b) => {
          const da = toMillis(a.date);
          const db = toMillis(b.date);
          if (da !== db) return da - db;
          return a.event_id.localeCompare(b.event_id);
        });

        // Conta: numero di coppie (player_id, event_id) fino a raggiungere X titoli
        let titlesSoFar = 0;
        let pairsSoFar  = 0;

        for (const t of arr) {
          pairsSoFar += 1;          // <-- qui conti la coppia unica (player_id, event_id)
          if (t.isWin) titlesSoFar += 1;
          if (titlesSoFar === maxTitles) {
            minimalToReach.push({
              player_id: pid,
              tournaments_played: pairsSoFar, // numero di coppie uniche necessarie per arrivare a X titoli
              titles: titlesSoFar,            // = maxTitles
            });
            break;
          }
        }
      }

      if (minimalToReach.length === 0) {
        return NextResponse.json([]);
      }

      // 4) Join anagrafica
      const players = await prisma.player.findMany({
        where: { id: { in: minimalToReach.map((e) => e.player_id) } },
        select: { id: true, atpname: true, ioc: true },
      });
      const playerById = new Map(players.map((p) => [String(p.id), p]));

      // 5) Ordina per #coppie necessarie e limita
      const result = minimalToReach
        .map((e) => ({
          player_id: e.player_id,
          player_name: playerById.get(e.player_id)?.atpname ?? '',
          ioc: playerById.get(e.player_id)?.ioc ?? '',
          titles: e.titles,
          tournaments_played: e.tournaments_played,
        }))
        .filter((r) => r.player_name)
        .sort((a, b) => {
          const da = a.tournaments_played ?? 0;
          const db = b.tournaments_played ?? 0;
          return orderAsc ? da - db : db - da;
        })
        .slice(0, limit);

      return NextResponse.json(result);
    }

    // =========================================================
    // 0 o 1 filtro -> usa MV mVNeededto (come da tua regola)
    // =========================================================
    const mvRows = await prisma.mVNeededto.findMany({
      select: {
        player_id: true,         // string
        overall_json: true,
        surface_json: true,
        level_json: true,
      },
    });

    const playerIds = mvRows.map((r) => String(r.player_id));
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, atpname: true, ioc: true },
    });
    const playerById = new Map(players.map((p) => [String(p.id), p]));

    const result: {
      player_id: string;
      player_name: string;
      ioc: string;
      titles: number;
      tournaments_played: number;
    }[] = [];

    for (const row of mvRows) {
      const pid = String(row.player_id);
      const playerInfo = playerById.get(pid);
      if (!playerInfo) continue;

      const overall = row.overall_json as OverallJson | undefined;
      const surfJson = row.surface_json as SurfaceJson | undefined;
      const lvlJson = row.level_json as LevelJson | undefined;

      const idx = idxByTitles(overall, maxTitles);
      if (idx < 0) continue;

      let tournamentsPlayed = 0;

      if (selectedSurfaces.length > 0 && selectedLevels.length === 0) {
        tournamentsPlayed = sumPlayedFromKeys(surfJson, selectedSurfaces, idx);
      } else if (selectedLevels.length > 0 && selectedSurfaces.length === 0) {
        tournamentsPlayed = sumPlayedFromKeys(lvlJson, selectedLevels, idx);
      } else {
        tournamentsPlayed = Number(overall?.[idx]?.played) || 0;
      }

      if (!tournamentsPlayed) continue;

      result.push({
        player_id: pid,
        player_name: playerInfo.atpname,
        ioc: playerInfo.ioc || '',
        titles: maxTitles,
        tournaments_played: tournamentsPlayed,
      });
    }

    result.sort((a, b) => {
      const da = a.tournaments_played ?? 0;
      const db = b.tournaments_played ?? 0;
      return orderAsc ? da - db : db - da;
    });

    return NextResponse.json(result.slice(0, limit));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
``
