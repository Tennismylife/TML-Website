"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from 'next/navigation';
import { Search, X } from "lucide-react";
import { getTourneyHref } from "@/lib/utils";

export default function TournamentSearch({ onDebouncedSearch }: { onDebouncedSearch?: (v: string) => void }) {
  const [search, setSearch] = useState("");
  const [suggestionResults, setSuggestionResults] = useState<Array<{ id: number; name: string[]; displayName: string; surfaces: string[]; years?: number[] }>>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);

  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionControllerRef = useRef<AbortController | null>(null);
  const suggestionsRef = useRef<HTMLUListElement | null>(null);

  const router = useRouter();

  // Debounce + fetch suggestions
  useEffect(() => {
    if (!search.trim()) {
      setSuggestionResults([]);
      setActiveSuggestionIndex(null);
      if (onDebouncedSearch) onDebouncedSearch("");
      return;
    }

    if (suggestionTimeoutRef.current) clearTimeout(suggestionTimeoutRef.current);
    suggestionTimeoutRef.current = setTimeout(() => {
      if (suggestionControllerRef.current) suggestionControllerRef.current.abort();
      suggestionControllerRef.current = new AbortController();
      fetch(`/api/tournaments/search?q=${encodeURIComponent(search)}&limit=8`, { signal: suggestionControllerRef.current.signal, cache: 'no-store' })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(j => setSuggestionResults(j?.results ?? []))
        .catch(() => setSuggestionResults([]));

      if (onDebouncedSearch) onDebouncedSearch(search);
    }, 200);

    return () => {
      if (suggestionTimeoutRef.current) clearTimeout(suggestionTimeoutRef.current);
      if (suggestionControllerRef.current) { suggestionControllerRef.current.abort(); suggestionControllerRef.current = null; }
    };
  }, [search, onDebouncedSearch]);

  // Cmd/Ctrl+K focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("tournament-search")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Reset active suggestion when search changes
  useEffect(() => {
    setActiveSuggestionIndex(null);
  }, [search]);

  // Scroll into view on change
  useEffect(() => {
    if (activeSuggestionIndex == null || !suggestionsRef.current) return;
    const el = suggestionsRef.current.querySelector(`[data-index="${activeSuggestionIndex}"]`) as HTMLElement | null;
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [activeSuggestionIndex]);

  return (
    <div className="sticky top-4 z-50 px-6 -mt-20 mb-12">
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          id="tournament-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            const len = suggestionResults.length;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (len === 0) return;
              setActiveSuggestionIndex(prev => (prev == null ? 0 : Math.min(prev + 1, len - 1)));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (len === 0) return;
              setActiveSuggestionIndex(prev => (prev == null ? len - 1 : Math.max(prev - 1, 0)));
            } else if (e.key === 'Enter') {
              if (activeSuggestionIndex != null && suggestionResults[activeSuggestionIndex]) {
                e.preventDefault();
                const t = suggestionResults[activeSuggestionIndex];
                router.push(getTourneyHref({ id: t.id }));
              }
            } else if (e.key === 'Escape') {
              setActiveSuggestionIndex(null);
            }
          }}
          placeholder="Search tournament"
          aria-label="Search tournaments"
          aria-controls="tourney-suggestions-list"
          aria-activedescendant={activeSuggestionIndex != null ? `tourney-option-${activeSuggestionIndex}` : undefined}
          className="w-full pl-14 pr-12 py-4 rounded-2xl bg-gray-900/90 backdrop-blur-xl border border-gray-800 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:shadow-lg focus:shadow-cyan-500/20 transition-all text-lg"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Suggestions dropdown (shows while typing) */}
        {search.trim() && (
          (() => {
            const matches = suggestionResults;
            if (!matches || matches.length === 0) return null;
            return (
              <div className="absolute left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50 max-h-64 overflow-auto">
                <ul
                  id="tourney-suggestions-list"
                  role="listbox"
                  aria-label="Tournaments suggestions"
                  className="p-1"
                  ref={suggestionsRef}
                >
                  {matches.map((t, idx) => {
                    const uniqNames = Array.isArray(t.name)
                      ? Array.from(new Set(t.name.map((n: any) => (n || '').toString().trim()).filter(Boolean)))
                      : [t.displayName || ''];

                    return (
                      <li
                        key={`${t.id}-${idx}`}
                        role="option"
                        id={`tourney-option-${idx}`}
                        data-index={idx}
                        aria-selected={activeSuggestionIndex === idx}
                        className={`cursor-pointer ${activeSuggestionIndex === idx ? 'bg-gray-700' : ''}`}
                        onMouseEnter={() => setActiveSuggestionIndex(idx)}
                      >
                        <a
                          href={getTourneyHref({ id: t.id })}
                          className="block px-4 py-2 hover:bg-gray-700"
                          onClick={(e) => { e.preventDefault(); router.push(getTourneyHref({ id: t.id })); }}
                        >
                          <div className="font-semibold">{uniqNames.join(', ')}</div>
                          <div className="text-xs text-gray-400">
                            {t.surfaces && t.surfaces.length ? `${t.surfaces.join(', ')} — ` : ''}
                            {t.years && t.years.length ? (t.years.length === 1 ? `${t.years[0]} — ` : `${Math.min(...t.years)}–${Math.max(...t.years)} — `) : ''}
                            id: {t.id}
                          </div>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
