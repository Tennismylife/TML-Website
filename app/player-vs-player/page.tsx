"use client";

import { useState, useEffect } from "react";
import PlayerSearch from "./PlayerSearch";
import BarRow from "./BarRow";
import PercentageRow from "./PercentageRow";
import { getFlagFromIOC } from "@/lib/utils";
import type { Match } from "@/types";

interface Player {
  id: string;
  atpname: string;
  ioc?: string;
}

interface PlayerStats {
  winsAll: number;
  winsGrandSlam: number;
  winsMasters1000: number;
  winsHard: number;
  winsGrass: number;
  winsClay: number;
  winsCarpet: number;
  totalAll: number;
  totalGrandSlam: number;
  totalMasters1000: number;
  totalHard: number;
  totalGrass: number;
  totalClay: number;
  totalCarpet: number;
  percAll: number;
  percGrandSlam: number;
  percMasters1000: number;
  percHard: number;
  percGrass: number;
  percClay: number;
  percCarpet: number;
  titlesAll: number;
  titlesGrandSlam: number;
  titlesMasters1000: number;
  titlesHard: number;
  titlesGrass: number;
  titlesClay: number;
  titlesCarpet: number;
}

export default function PlayerVsPlayerPage() {
  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);

  const [stats1, setStats1] = useState<PlayerStats | null>(null);
  const [stats2, setStats2] = useState<PlayerStats | null>(null);

  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [errorMatches, setErrorMatches] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    year: "All" as number | "All",
    level: "All",
    surface: "All",
    round: "All",
    tournament: "All",
  });

  // --- Fetch player stats ---
  useEffect(() => {
    if (player1) {
      fetch(`/api/players/stats?id=${player1.id}`)
        .then(res => res.json())
        .then((data: PlayerStats) => setStats1(data))
        .catch(err => console.error("Error fetching stats1:", err));
    } else {
      setStats1(null);
    }
  }, [player1]);

  useEffect(() => {
    if (player2) {
      fetch(`/api/players/stats?id=${player2.id}`)
        .then(res => res.json())
        .then((data: PlayerStats) => setStats2(data))
        .catch(err => console.error("Error fetching stats2:", err));
    } else {
      setStats2(null);
    }
  }, [player2]);

  // --- Fetch H2H matches ---
  useEffect(() => {
    if (!player1 || !player2) {
      setMatches([]);
      return;
    }

    setLoadingMatches(true);
    setErrorMatches(null);

    fetch(`/api/h2h/matches?p1=${player1.id}&p2=${player2.id}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch matches");
        return res.json();
      })
      .then((data: Match[]) => setMatches(data))
      .catch(err => setErrorMatches(err.message))
      .finally(() => setLoadingMatches(false));
  }, [player1, player2]);

  // --- Filtered matches ---
  const filteredMatches = matches.filter(m => {
    const yearOk = filters.year === "All" || m.year === filters.year;
    const levelOk = filters.level === "All" || m.tourney_level === filters.level;
    const surfaceOk = filters.surface === "All" || m.surface === filters.surface;
    const roundOk = filters.round === "All" || m.round === filters.round;
    const tourneyOk = filters.tournament === "All" || m.tourney_name === filters.tournament;
    return yearOk && levelOk && surfaceOk && roundOk && tourneyOk;
  });

  // --- Render ---
  return (
    <main className="mx-auto max-w-6xl p-4 text-white">
      <h1 className="text-2xl font-bold mb-6 text-center">Player vs Player</h1>

      {/* PLAYER SEARCHERS */}
      <div className="flex gap-4 mb-8">
        <PlayerSearch label="Player 1" onSelect={setPlayer1} />
        <PlayerSearch label="Player 2" onSelect={setPlayer2} />
      </div>

      {/* STATISTICS */}
      {player1 && player2 && stats1 && stats2 && (
        <>
          {/* Wins */}
          <div className="mt-10">
            <h2 className="text-xl font-semibold mb-4 text-center">Wins</h2>
            <div className="space-y-4">
              <BarRow label="All" statKey="winsAll" stats1={stats1} stats2={stats2} type="wins" />
              <BarRow label="Grand Slam" statKey="winsGrandSlam" stats1={stats1} stats2={stats2} type="wins" />
              <BarRow label="Masters 1000" statKey="winsMasters1000" stats1={stats1} stats2={stats2} type="wins" />
              <BarRow label="Hard" statKey="winsHard" stats1={stats1} stats2={stats2} type="wins" />
              <BarRow label="Grass" statKey="winsGrass" stats1={stats1} stats2={stats2} type="wins" />
              <BarRow label="Clay" statKey="winsClay" stats1={stats1} stats2={stats2} type="wins" />
              <BarRow label="Carpet" statKey="winsCarpet" stats1={stats1} stats2={stats2} type="wins" />
            </div>
          </div>

          {/* Win Percentages */}
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-4 text-center">Win Percentage</h2>
            <div className="space-y-4">
              <PercentageRow label="All" perc1={stats1.percAll} perc2={stats2.percAll} />
              <PercentageRow label="Grand Slam" perc1={stats1.percGrandSlam} perc2={stats2.percGrandSlam} />
              <PercentageRow label="Masters 1000" perc1={stats1.percMasters1000} perc2={stats2.percMasters1000} />
              <PercentageRow label="Hard" perc1={stats1.percHard} perc2={stats2.percHard} />
              <PercentageRow label="Grass" perc1={stats1.percGrass} perc2={stats2.percGrass} />
              <PercentageRow label="Clay" perc1={stats1.percClay} perc2={stats2.percClay} />
              <PercentageRow label="Carpet" perc1={stats1.percCarpet} perc2={stats2.percCarpet} />
            </div>
          </div>

          {/* Titles */}
          <div className="mt-12 mb-10">
            <h2 className="text-xl font-semibold mb-4 text-center">Titles</h2>
            <div className="space-y-4">
              <BarRow label="All" statKey="titlesAll" stats1={stats1} stats2={stats2} type="titles" />
              <BarRow label="Grand Slam" statKey="titlesGrandSlam" stats1={stats1} stats2={stats2} type="titles" />
              <BarRow label="Masters 1000" statKey="titlesMasters1000" stats1={stats1} stats2={stats2} type="titles" />
              <BarRow label="Hard" statKey="titlesHard" stats1={stats1} stats2={stats2} type="titles" />
              <BarRow label="Grass" statKey="titlesGrass" stats1={stats1} stats2={stats2} type="titles" />
              <BarRow label="Clay" statKey="titlesClay" stats1={stats1} stats2={stats2} type="titles" />
              <BarRow label="Carpet" statKey="titlesCarpet" stats1={stats1} stats2={stats2} type="titles" />
            </div>
          </div>
        </>
      )}
    </main>
  );
}
