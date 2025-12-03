"use client";

import React, { useEffect, useState, useMemo } from "react";
import type { Match } from "@/types";
import H2HFilters from "./H2HFilters";
import H2HTable from "./H2HTable";

interface H2HPageProps {
  playerId: string;
  mainPlayerName: string; // nome completo del giocatore principale
}

export default function H2HPage({ playerId, mainPlayerName }: H2HPageProps) {
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    year: "All" as number | "All",
    level: "All",
    surface: "All",
    round: "All",
    tournament: "All",
    opponent: "",
  });

  // Fetch dei match H2H
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/players/h2h?id=${encodeURIComponent(playerId)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Match[] = await res.json();
        if (!abort) setAllMatches(data);
      } catch {
        if (!abort) setError("Errore nel caricamento dei match.");
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [playerId]);

  // Filtra i match in base ai filtri selezionati, incluso opponent
  const displayedMatches = useMemo(() => {
    let matches = allMatches.map(m => ({
      ...m,
      opponent: m.winner_name === mainPlayerName ? m.loser_name : m.winner_name
    }));

    if (filters.opponent) {
      matches = matches.filter(m =>
        m.opponent.toLowerCase().includes(filters.opponent.toLowerCase())
      );
    }
    if (filters.year !== "All") matches = matches.filter(m => m.year === filters.year);
    if (filters.level !== "All") matches = matches.filter(m => m.tourney_level === filters.level);
    if (filters.surface !== "All") matches = matches.filter(m => m.surface === filters.surface);
    if (filters.round !== "All") matches = matches.filter(m => m.round === filters.round);
    if (filters.tournament !== "All") matches = matches.filter(m => m.tourney_name === filters.tournament);

    return matches;
  }, [allMatches, filters, mainPlayerName]);

  return (
    <section className="p-4 space-y-4">
      <H2HFilters
        mainPlayer={mainPlayerName}
        allMatches={allMatches}
        loading={loading}
        error={error}
        filters={filters}
        setFilters={f => setFilters(prev => ({ ...prev, ...f }))}
      />
      <H2HTable
        playerId={playerId}
        allMatches={displayedMatches}
        loading={loading}
        error={error}
        filters={filters}
      />
    </section>
  );
}
