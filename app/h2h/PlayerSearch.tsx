"use client";

import { useState, useEffect } from "react";
import { getFlagFromIOC } from "@/lib/utils";
import { Player} from "@/types";

interface PlayerSearchProps {
  label: string;
  onSelect: (player: Player) => void;
}

export default function PlayerSearch({ label, onSelect }: PlayerSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Fetch player search
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/h2h/search?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then(res => res.json())
      .then((data: Player[]) => setResults(data))
      .catch(err => {
        if (err.name !== "AbortError") console.error("Search error:", err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [query]);

  const handleSelect = (player: Player) => {
    setSelectedPlayer(player);
    setQuery("");
    setResults([]);
    onSelect(player);
  };

  return (
    <div className="flex-1">
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search player..."
        className="w-full border border-gray-600 bg-gray-800 text-white rounded px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
      />

      {selectedPlayer && (
        <div className="mt-2 p-2 bg-gray-700 rounded flex items-center gap-2 text-white">
          {getFlagFromIOC(selectedPlayer.ioc ?? "")} {selectedPlayer.atpname}
        </div>
      )}

      {loading && <p className="text-sm text-gray-400 mt-1">Loading...</p>}

      {results.length > 0 && (
        <ul className="border border-gray-600 mt-1 rounded max-h-60 overflow-y-auto bg-gray-900 text-white shadow-lg">
          {results.map(p => (
            <li
              key={p.id}
              onClick={() => handleSelect(p)}
              className="px-3 py-2 hover:bg-gray-700 cursor-pointer flex items-center gap-2"
            >
              {getFlagFromIOC(p.ioc ?? "")} {p.atpname}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
