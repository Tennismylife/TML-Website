"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getFlagFromIOC } from "@/lib/utils";

export default function SearchPlayerClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        setSelectedIndex(-1);
        return;
      }

      setLoading(true);

      fetch(`/api/h2h/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          setResults(Array.isArray(data) ? data : []);
          setSelectedIndex(-1);
        })
        .catch((err) => {
          if (err.name !== "AbortError") console.error("Search error:", err);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const handleSelect = (player: any) => {
    router.push(`/players/${player.slug}`);
    setQuery("");
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = selectedIndex >= 0 ? results[selectedIndex] : results[0];
      if (target) handleSelect(target);
    } else if (e.key === "Escape") {
      setQuery("");
      setResults([]);
    }
  };

  return (
    <div className="w-full mb-8">
      <div className="w-full">
        <div className="w-full relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search for a player..."
            aria-label="Search for an ATP player"
            autoComplete="off"
            className="w-full bg-gray-800 text-gray-100 placeholder-gray-400 border border-gray-700 rounded px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />

          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
                inputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}

          {loading && (
            <ul className="border border-gray-700 mt-1 rounded max-h-60 overflow-y-auto bg-gray-800">
              {[...Array(4)].map((_, i) => (
                <li key={i} className="px-3 py-2 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                </li>
              ))}
            </ul>
          )}

          {results.length > 0 && !loading && (
            <ul className="border border-gray-700 mt-1 rounded max-h-60 overflow-y-auto bg-gray-800 text-gray-100">
              {results.map((p, index) => (
                <li
                  key={p.id}
                  data-idx={index}
                  onClick={() => handleSelect(p)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`px-3 py-2 cursor-pointer flex items-center gap-2 rounded transition-colors ${
                    index === selectedIndex
                      ? "bg-yellow-600 text-white"
                      : "hover:bg-gray-700"
                  }`}
                >
                  {getFlagFromIOC(p.ioc)} {p.atpname}
                </li>
              ))}
            </ul>
          )}

          {results.length === 0 && query && !loading && (
            <p className="text-sm text-gray-400 mt-1 text-center">No players found</p>
          )}
        </div>
      </div>
    </div>
  );
}
