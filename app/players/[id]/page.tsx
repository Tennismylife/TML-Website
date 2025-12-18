"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFlagFromIOC } from "@/lib/utils";
import PlayerTabs from "./PlayerTabs";
import { Player } from "@/types";

export default function PlayerPage(props: any) {
  const params = (React as any).use ? (React as any).use(props.params) : props.params;
  const playerId = params?.id ?? props.params?.id;

  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // ⬇️ API URL LASCIATO IDENTICO
        const res = await fetch(
          `/api/players?id=${encodeURIComponent(playerId)}&slug=${encodeURIComponent(playerId)}`,
          { signal: controller.signal }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: Player = await res.json();
        setPlayer(data);

        // slug SOLO per l'URL del browser
        const slug = (data.atpname || data.player || data.id)
          .toString()
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-");

        const desired = `/players/${encodeURIComponent(slug)}${window.location.search}`;
        window.history.replaceState(null, "", desired);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError("Errore nel caricamento del giocatore.");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [playerId, router]);

  if (loading) return <p className="p-4 text-gray-400">Loading…</p>;
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
    <main className="min-h-screen w-full bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gray-800/95 backdrop-blur-md border-b border-gray-700 py-3 px-0">
        <div className="w-full flex items-center gap-2">
          {player.ioc && getFlagFromIOC(player.ioc) && (
            <span>{getFlagFromIOC(player.ioc)}</span>
          )}
          <h1 className="text-2xl font-bold">{player.atpname}</h1>
        </div>
      </header>

      {/* Tabs */}
      <PlayerTabs player={player} tabs={tabs} />
    </main>
  );
}
