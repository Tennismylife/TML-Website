"use client";

import { useMemo, useState } from "react";
import type { Match } from "@/types";

const ROUND_ORDER = ["Q1","Q2","Q3","R128","R64","R32","R16","QF","SF","F","W","RR","BR","Unknown"];

function toDate(d: string | Date | null | undefined) {
  if (!d) return null;
  const dt = new Date(d as any);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

function roundWeight(r?: string) {
  const idx = ROUND_ORDER.indexOf((r ?? "Unknown") as any);
  return idx >= 0 ? idx : -1;
}

function extractOppIOC(m: any, iAmWinner: boolean): string | undefined {
  const ioc = iAmWinner ? m.loser_ioc : m.winner_ioc;
  return typeof ioc === "string" ? ioc.toUpperCase() : undefined;
}

interface Filters {
  year: number | "All";
  level: string;
  surface: string;
  round: string;
  tournament: string;
}

export function useH2HData(allMatches: Match[], playerId: string, filters: Filters) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Filtra i match validi
  const filtered = useMemo(() => {
    const src = Array.isArray(allMatches) ? allMatches : [];
    return src.filter((m) => {
      // status ora viene filtrato sul server/API, quindi non è più necessario qui.
      const yOk = filters.year === "All" || m.year === filters.year;
      const lOk = filters.level === "All" || (m.tourney_level ?? "Unknown") === filters.level;
      const sOk = filters.surface === "All" || (m.surface ?? "Unknown") === filters.surface;
      const rOk = filters.round === "All" || (m.round ?? "Unknown") === filters.round;
      const tOk = filters.tournament === "All" || m.tourney_name === filters.tournament;
      return yOk && lOk && sOk && rOk && tOk;
    });
  }, [allMatches, filters]);

  // Calcolo ultima partita contro ogni avversario
  const lastByOpponent = useMemo(() => {
    if (!Array.isArray(filtered) || filtered.length === 0) return new Map<string, any>();
    const map = new Map<string, any>();
    for (const m of filtered) {
       const iAmWinner = String(m.winner_id) === String(playerId);
       const iAmPlayer = iAmWinner || String(m.loser_id) === String(playerId);
       if (!iAmPlayer) continue;

       const oppId = iAmWinner ? String(m.loser_id) : String(m.winner_id);
       const d = toDate(m.tourney_date);
       const dateMs = d ? d.getTime() : 0;
       const rW = roundWeight(m.round as string);
       const prev = map.get(oppId);
       const isNewer = !prev || dateMs > prev.dateMs || (dateMs === prev.dateMs && rW > prev.roundW);

       if (isNewer) {
         map.set(oppId, {
           won: iAmWinner,
           score: (m as any).score ?? "",
           year: m.year ?? null,
           tourney_name: (m as any).tourney_name ?? "Unknown",
           surface: (m as any).surface ?? "-",
           round: (m as any).round ?? "-",
           dateMs,
           roundW: rW,
         });
       }
     }
     return map;
   }, [filtered, playerId]);

  // Aggrega e ordina
  const rows = useMemo(() => {
    const byOpp = new Map<string, any>();
    for (const m of filtered) {
      // status già filtrato dall'API
       const iAmWinner = String(m.winner_id) === String(playerId);
       const oppId = iAmWinner ? String(m.loser_id) : String(m.winner_id);
       const oppName = iAmWinner
         ? (m as any).loser_name ?? (m as any).loser ?? `Player ${oppId}`
         : (m as any).winner_name ?? (m as any).winner ?? `Player ${oppId}`;
       const oppIOC = extractOppIOC(m as any, iAmWinner);

       const cur = byOpp.get(oppId) ?? { oppId, oppName, wins: 0, losses: 0, matches: 0, ioc: oppIOC };
       if (!cur.ioc && oppIOC) cur.ioc = oppIOC;
       if (iAmWinner) cur.wins++; else cur.losses++;
       cur.matches++;
       byOpp.set(oppId, cur);
     }

    let arr = Array.from(byOpp.values()).map(r => ({ ...r, winPct: r.matches ? (r.wins / r.matches) * 100 : 0 }));

    // Ordinamento
    if (!sortKey) {
      // Predefinito: matches decrescente
      arr.sort((a, b) => b.matches - a.matches || a.oppName.localeCompare(b.oppName));
    } else {
      arr.sort((a, b) => {
        let aVal: any, bVal: any;
        if (sortKey === "oppName") { aVal = a.oppName; bVal = b.oppName; }
        else if (sortKey === "lastMatch") { aVal = lastByOpponent.get(a.oppId)?.dateMs ?? 0; bVal = lastByOpponent.get(b.oppId)?.dateMs ?? 0; }
        else if (sortKey === "matches") { aVal = a.matches; bVal = b.matches; }
        else if (sortKey === "wins") { aVal = a.wins; bVal = b.wins; }
        else if (sortKey === "losses") { aVal = a.losses; bVal = b.losses; }
        else if (sortKey === "winPct") { aVal = a.winPct; bVal = b.winPct; }
        else return 0;

        if (typeof aVal === "string" && typeof bVal === "string")
          return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        if (typeof aVal === "number" && typeof bVal === "number")
          return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        return 0;
      });
    }

    return arr;
  }, [filtered, playerId, sortKey, sortDir, lastByOpponent]);

  function handleSort(key: string) {
    setSortDir(prevDir => sortKey === key ? (prevDir === "asc" ? "desc" : "asc") : "asc");
    setSortKey(key);
  }

  return { rows, lastByOpponent, sortKey, sortDir, handleSort };
}
