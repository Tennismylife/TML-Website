"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Flag from "@/components/Flag";
import { getPlayerHref } from "@/lib/utils";
import { aggregateEditionPlayerStats, pct } from "./editionAggregateStats";

function formatPct(value: number | null) {
  return value == null ? "-" : `${value.toFixed(1)}%`;
}

function formatRawPct(rawA: number, rawB: number, pctValue: number | null) {
  if (!rawB) return "-";
  return `${rawA}/${rawB} (${formatPct(pctValue)})`;
}

type SortKey =
  | "rank"
  | "player"
  | "record"
  | "minutes"
  | "aces"
  | "doubleFaults"
  | "firstInPct"
  | "firstWonPct"
  | "secondWonPct"
  | "breakPointsFaced"
  | "bpSavedPct"
  | "spwPct"
  | "rpwPct";

function sortablePct(value: number | null) {
  return value == null ? -1 : value;
}

const HEADER_TITLES: Record<SortKey, string> = {
  rank: "Best ranking shown for the player in this tournament edition",
  player: "Player name",
  record: "Wins and losses in this tournament edition",
  minutes: "Total minutes played in this tournament edition",
  aces: "Total aces",
  doubleFaults: "Total double faults",
  firstInPct: "First serves in / total service points",
  firstWonPct: "First-serve points won / first serves in",
  secondWonPct: "Second-serve points won / second-serve points played",
  breakPointsFaced: "Break points faced / total service points",
  bpSavedPct: "Break points saved / break points faced",
  spwPct: "Service points won / total service points",
  rpwPct: "Return points won / total return points played",
};

export default function EditionAggregateStatsServer({
  matches,
  tournamentName,
  year,
}: {
  matches: any[];
  tournamentName: string;
  year: string;
}) {
  const players = aggregateEditionPlayerStats(matches);
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  if (!players.length) return null;

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const aFirstInPct = sortablePct(pct(a.firstServeIn, a.servicePoints));
      const bFirstInPct = sortablePct(pct(b.firstServeIn, b.servicePoints));
      const aFirstWonPct = sortablePct(pct(a.firstServeWon, a.firstServeIn));
      const bFirstWonPct = sortablePct(pct(b.firstServeWon, b.firstServeIn));
      const aSecondWonPct = sortablePct(
        pct(a.secondServeWon, Math.max(0, a.servicePoints - a.firstServeIn)),
      );
      const bSecondWonPct = sortablePct(
        pct(b.secondServeWon, Math.max(0, b.servicePoints - b.firstServeIn)),
      );
      const aBpSavedPct = sortablePct(pct(a.breakPointsSaved, a.breakPointsFaced));
      const bBpSavedPct = sortablePct(pct(b.breakPointsSaved, b.breakPointsFaced));
      const aSpwPct = sortablePct(pct(a.firstServeWon + a.secondServeWon, a.servicePoints));
      const bSpwPct = sortablePct(pct(b.firstServeWon + b.secondServeWon, b.servicePoints));
      const aRpwPct = sortablePct(pct(a.returnPointsWon, a.returnPointsPlayed));
      const bRpwPct = sortablePct(pct(b.returnPointsWon, b.returnPointsPlayed));

      let result = 0;

      switch (sortKey) {
        case "rank":
          result = (a.rank ?? 9999) - (b.rank ?? 9999);
          break;
        case "player":
          result = a.name.localeCompare(b.name);
          break;
        case "record":
          result = (a.wins - a.losses) - (b.wins - b.losses);
          if (result === 0) result = a.wins - b.wins;
          break;
        case "aces":
          result = a.aces - b.aces;
          break;
        case "minutes":
          result = a.minutes - b.minutes;
          break;
        case "doubleFaults":
          result = a.doubleFaults - b.doubleFaults;
          break;
        case "firstInPct":
          result = aFirstInPct - bFirstInPct;
          break;
        case "firstWonPct":
          result = aFirstWonPct - bFirstWonPct;
          break;
        case "secondWonPct":
          result = aSecondWonPct - bSecondWonPct;
          break;
        case "breakPointsFaced":
          result = a.breakPointsFaced - b.breakPointsFaced;
          break;
        case "bpSavedPct":
          result = aBpSavedPct - bBpSavedPct;
          break;
        case "spwPct":
          result = aSpwPct - bSpwPct;
          break;
        case "rpwPct":
          result = aRpwPct - bRpwPct;
          break;
      }

      if (result === 0) {
        result = a.name.localeCompare(b.name);
      }

      return sortDir === "asc" ? result : -result;
    });
  }, [players, sortDir, sortKey]);

  function onSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDir(nextKey === "player" || nextKey === "rank" ? "asc" : "desc");
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  return (
    <section className="mt-8 rounded border border-white/10 bg-[#111111] shadow">
      <div className="border-b border-white/10 px-4 py-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight" style={{ color: "#ffffff" }}>
          Player Stats
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm text-[#e7e7e7]">
          <caption className="sr-only">
            Aggregate player statistics for {tournamentName} {year}
          </caption>
          <thead>
            <tr className="bg-[#1a1a1a] text-xs uppercase tracking-[0.12em]">
              <th title={HEADER_TITLES.rank} className="border-b border-white/10 px-3 py-3 text-center font-medium cursor-pointer select-none" style={{ color: "#ffffff" }} onClick={() => onSort("rank")}>Rk{sortIndicator("rank")}</th>
              <th title={HEADER_TITLES.player} className="border-b border-white/10 px-3 py-3 text-center font-medium cursor-pointer select-none" style={{ color: "#ffffff" }} onClick={() => onSort("player")}>Player{sortIndicator("player")}</th>
              <th title={HEADER_TITLES.record} className="border-b border-white/10 px-3 py-3 text-center font-medium cursor-pointer select-none" style={{ color: "#ffffff" }} onClick={() => onSort("record")}>W-L{sortIndicator("record")}</th>
              <th title={HEADER_TITLES.minutes} className="border-b border-white/10 px-3 py-3 text-center font-medium cursor-pointer select-none" style={{ color: "#ffffff" }} onClick={() => onSort("minutes")}>Min{sortIndicator("minutes")}</th>
              <th title={HEADER_TITLES.aces} className="border-b border-white/10 px-3 py-3 text-center font-medium cursor-pointer select-none" style={{ color: "#ffffff" }} onClick={() => onSort("aces")}>Aces{sortIndicator("aces")}</th>
              <th title={HEADER_TITLES.doubleFaults} className="border-b border-white/10 px-3 py-3 text-center font-medium cursor-pointer select-none" style={{ color: "#ffffff" }} onClick={() => onSort("doubleFaults")}>DF{sortIndicator("doubleFaults")}</th>
              <th title={HEADER_TITLES.firstInPct} className="border-b border-white/10 px-3 py-3 text-center font-medium cursor-pointer select-none" style={{ color: "#ffffff" }} onClick={() => onSort("firstInPct")}>1st In{sortIndicator("firstInPct")}</th>
              <th title={HEADER_TITLES.firstWonPct} className="border-b border-white/10 px-3 py-3 text-center font-medium cursor-pointer select-none" style={{ color: "#ffffff" }} onClick={() => onSort("firstWonPct")}>1st Won{sortIndicator("firstWonPct")}</th>
              <th title={HEADER_TITLES.secondWonPct} className="border-b border-white/10 px-3 py-3 text-center font-medium cursor-pointer select-none" style={{ color: "#ffffff" }} onClick={() => onSort("secondWonPct")}>2nd Won{sortIndicator("secondWonPct")}</th>
              <th title={HEADER_TITLES.breakPointsFaced} className="border-b border-white/10 px-3 py-3 text-center font-medium cursor-pointer select-none" style={{ color: "#ffffff" }} onClick={() => onSort("breakPointsFaced")}>BP Faced{sortIndicator("breakPointsFaced")}</th>
              <th title={HEADER_TITLES.bpSavedPct} className="border-b border-white/10 px-3 py-3 text-center font-medium cursor-pointer select-none" style={{ color: "#ffffff" }} onClick={() => onSort("bpSavedPct")}>BP Saved{sortIndicator("bpSavedPct")}</th>
              <th title={HEADER_TITLES.spwPct} className="border-b border-white/10 px-3 py-3 text-center font-medium cursor-pointer select-none" style={{ color: "#ffffff" }} onClick={() => onSort("spwPct")}>SPW{sortIndicator("spwPct")}</th>
              <th title={HEADER_TITLES.rpwPct} className="border-b border-white/10 px-3 py-3 text-center font-medium cursor-pointer select-none" style={{ color: "#ffffff" }} onClick={() => onSort("rpwPct")}>RPW{sortIndicator("rpwPct")}</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player, index) => {
              const firstInPct = pct(player.firstServeIn, player.servicePoints);
              const firstWonPct = pct(player.firstServeWon, player.firstServeIn);
              const secondServePoints = Math.max(0, player.servicePoints - player.firstServeIn);
              const secondWonPct = pct(player.secondServeWon, secondServePoints);
              const bpFacedPct = pct(player.breakPointsFaced, player.servicePoints);
              const bpSavedPct = pct(player.breakPointsSaved, player.breakPointsFaced);
              const servicePointsWon = player.firstServeWon + player.secondServeWon;
              const spwPct = pct(servicePointsWon, player.servicePoints);
              const rpwPct = pct(player.returnPointsWon, player.returnPointsPlayed);

              return (
                <tr
                  key={player.playerId}
                  className={index % 2 === 0 ? "bg-[#121212]" : "bg-[#181818]"}
                >
                  <td className="px-3 py-3 text-center tabular-nums">{player.rank ?? "-"}</td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                      {player.ioc ? <Flag ioc={player.ioc} className="h-3.5 w-5" /> : null}
                      <Link
                        href={getPlayerHref(player.slug ?? player.playerId)}
                        className="text-[#f3f3f3] hover:text-[#d6b36a] hover:underline"
                      >
                        {player.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums">
                    {player.wins}-{player.losses}
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums">{player.minutes || "-"}</td>
                  <td className="px-3 py-3 text-center tabular-nums">{player.aces}</td>
                  <td className="px-3 py-3 text-center tabular-nums">{player.doubleFaults}</td>
                  <td className="px-3 py-3 text-center tabular-nums">
                    {formatRawPct(player.firstServeIn, player.servicePoints, firstInPct)}
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums">
                    {formatRawPct(player.firstServeWon, player.firstServeIn, firstWonPct)}
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums">
                    {formatRawPct(player.secondServeWon, secondServePoints, secondWonPct)}
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums">
                    {formatRawPct(player.breakPointsFaced, player.servicePoints, bpFacedPct)}
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums">
                    {formatRawPct(player.breakPointsSaved, player.breakPointsFaced, bpSavedPct)}
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums">
                    {formatRawPct(servicePointsWon, player.servicePoints, spwPct)}
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums">
                    {formatRawPct(player.returnPointsWon, player.returnPointsPlayed, rpwPct)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
