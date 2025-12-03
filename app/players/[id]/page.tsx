"use client";

import React from "react";
import { useEffect, useState } from "react";
import { getFlagFromIOC } from "@/lib/utils";
import PlayerTabs from "./PlayerTabs";
import { Player } from "@/types";

export default function PlayerPage(props: any) {
  // props.params potrebbe essere una Promise in alcune versioni di Next.js.
  // Usiamo React.use (se presente) per "unwrap" la Promise, altrimenti fallback a props.params.
  // Questo rimuove l'avviso e mantiene compatibilità col passato.
  const params = (React as any).use ? (React as any).use(props.params) : props.params;
  const playerId = params?.id ?? props.params?.id;

  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/players?id=${encodeURIComponent(playerId)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Player = await res.json();
        setPlayer(data);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError("Errore nel caricamento del giocatore.");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [playerId]);

  if (loading) return <p className="p-4 text-gray-400">Loading...</p>;
  if (error) return <p className="p-4 text-red-400">{error}</p>;
  if (!player) return null;

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "matches", label: "Matches" },
    { id: "season", label: "Seasons" },
    { id: "tournaments", label: "Tournaments" },
    { id: "h2h", label: "H2H" },
    { id: "performance", label: "Performance" },
    { id: "statistics", label: "Statistics" },
  ];

  return (
    <div className="min-h-screen w-screen flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gray-800/95 backdrop-blur-md border-b border-gray-700 p-4 flex items-center gap-2">
        {player.ioc && getFlagFromIOC(player.ioc) && <span>{getFlagFromIOC(player.ioc)}</span>}
        <h1 className="text-2xl font-bold">{player.atpname}</h1>
      </div>

      {/* Tabs */}
      <PlayerTabs player={player} tabs={tabs} />
    </div>
  );
}
