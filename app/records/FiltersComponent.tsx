"use client";

import React from 'react';
import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const SURFACE_LIST = ["Hard", "Clay", "Grass", "Carpet"];
const ROUND_LIST = ["R128", "R64", "R32", "R16", "QF", "SF", "F"];
const BEST_OF_LIST = [3, 5, 1];

interface FiltersComponentProps {
  selectedSurfaces: Set<string>;
  setSelectedSurfaces: Dispatch<SetStateAction<Set<string>>>;
  selectedLevels: Set<string>;
  setSelectedLevels: Dispatch<SetStateAction<Set<string>>>;
  selectedRounds: string;
  setSelectedRounds: Dispatch<SetStateAction<string>>;
  selectedBestOf: number | null;
  setSelectedBestOf: Dispatch<SetStateAction<number | null>>;
  activeTab: string;
  activeSubTab?: string;
}

function FilterButton({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`px-5 py-2 rounded-full font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-2
        ${isActive ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg" : "bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer"}`}
    >
      {children}
    </button>
  );
}

export default function FiltersComponent({
  selectedSurfaces,
  setSelectedSurfaces,
  selectedLevels,
  setSelectedLevels,
  selectedRounds,
  setSelectedRounds,
  selectedBestOf,
  setSelectedBestOf,
  activeTab,
  activeSubTab,
}: FiltersComponentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastAppliedQS = useRef<string | null>(null);
  // Persist the last canonical query we applied across navigations so an in-memory ref reset
  // doesn't cause repeated normalization (common when router.replace remounts the component).
  const STORAGE_KEY = "records-last-applied-canon";

  const surfaceEmojis: Record<string, string> = {
    Hard: "🟦",
    Clay: "🟧",
    Grass: "🟩",
    Carpet: "🟪",
  };

  const levelList = ["G", "M", "F", "A", "250", "500", "D"];
  const levelNames: Record<string, string> = {
    G: "Grand Slam",
    M: "Masters 1000",
    F: "ATP Finals",
    500: "500",
    250: "250",
    A: "Others",
    D: "Davis Cup",
  };

  const isSeasonsOrSame = activeTab === "same" || activeTab === "seasons";
  const isAtAgeLike = activeTab === "atage" || activeTab === "ageofnth";
  const hideRoundAndBestOfSubtabs = ["oldest","youngest","oldestWinners","youngestWinners"];

  const shouldShowFilter = (filter: "levels" | "rounds" | "bestOf" | "surfaces") => {
    // Percentage → tutti i filtri attivi
    if (activeTab === "percentage") return true;

    // H2H Count → tutti i filtri attivi
    if (activeTab === "h2h" && activeSubTab === "count") return true;

    // Streak → wins
    if (activeTab === "streak" && activeSubTab === "wins") return true;

    // Streak → round
    if (activeTab === "streak" && activeSubTab === "round") {
      return ["levels", "surfaces", "rounds"].includes(filter);
    }

    // Ages → oldest / youngest
    if (activeTab === "ages" && (activeSubTab === "oldest" || activeSubTab === "youngest")) {
      return ["levels", "surfaces", "rounds"].includes(filter);
    }

    // Wins, Played, Ages, Percentage → tutti i filtri visibili (eccetto subtab che nascondono round/bestOf)
    if (
      ["wins","played"].includes(activeTab) || 
      activeTab === "ages" || 
      (activeTab === "seasons" && ["wins","played","percentage"].includes(activeSubTab || "")) ||
      (isAtAgeLike && ["wins","played"].includes(activeSubTab || ""))
    ) {
      if (hideRoundAndBestOfSubtabs.includes(activeSubTab || "") && (filter === "rounds" || filter === "bestOf")) return false;
      return true;
    }

    // Entries / Titles → Level e Surface
    if (
      ["entries","titles"].includes(activeTab) || 
      (isSeasonsOrSame && ["entries","titles"].includes(activeSubTab || "")) ||
      (isAtAgeLike && ["entries","titles"].includes(activeSubTab || "")) ||
      (activeTab === "neededto" && activeSubTab === "titles")
    ) {
      return ["levels","surfaces"].includes(filter);
    }

    // Count → Level, Surface, Round
    if (activeTab === "count") {
      return ["levels","surfaces","rounds"].includes(filter);
    }

    // Timespan
    if (activeTab === "timespan") {
      if (["entries","titles"].includes(activeSubTab || "")) return ["levels","surfaces"].includes(filter);
      if (activeSubTab === "rounds") return ["levels","surfaces","rounds"].includes(filter);
    }

    // Roundsonentries
    if (activeTab === "roundsonentries") {
      if (activeSubTab === "titles") return ["levels","surfaces"].includes(filter);
      if (activeSubTab === "round" ) return ["levels","surfaces","rounds"].includes(filter);
    }

    // Same / Seasons
    if (isSeasonsOrSame) {
      if (["wins","played","percentage"].includes(activeSubTab || "")) return true;
      if (["entries","titles"].includes(activeSubTab || "")) return ["levels","surfaces"].includes(filter);
      if (activeSubTab === "round" ) return ["levels","surfaces","rounds"].includes(filter);
    }

    // ATAge / AgeOfNth
    if (isAtAgeLike) {
      if (["entries","titles"].includes(activeSubTab || "")) return ["levels","surfaces"].includes(filter);
      if (["slam","slams"].includes(activeSubTab || "")) return ["surfaces","rounds"].includes(filter);
      if (activeSubTab === "round" ) return ["levels","surfaces","rounds"].includes(filter);
    }

    // CounterSeasons → rounds subtab
    if (activeTab === "counterseasons" && activeSubTab === "round") {
      return ["levels","surfaces","rounds"].includes(filter);
    }

    // CounterSeasons → titles subtab
    if (activeTab === "counterseasons" && activeSubTab === "titles") {
      return ["levels","surfaces"].includes(filter);
    }

    return false;
  };

  const showLevels = shouldShowFilter("levels");
  const showRounds = shouldShowFilter("rounds");
  const showBestOf = shouldShowFilter("bestOf");
  const showSurfaces = shouldShowFilter("surfaces");

  const showAllRounds = !(
    (isAtAgeLike && activeSubTab === "round") ||
    (activeTab === "same" && activeSubTab === "round") ||
    (activeTab === "seasons" && activeSubTab === "round") ||
    (activeTab === "timespan" && activeSubTab === "rounds") ||
    (activeTab === "roundsonentries" && activeSubTab === "round") ||
    (activeTab === "counterseasons" && activeSubTab === "round") ||
    (activeTab === "streak" && activeSubTab === "round") ||
    activeTab === "count"
  );

  const filteredLevelList = levelList.filter(l => {
    if (isAtAgeLike && activeSubTab === "wins") return true;
    if (["count","entries","titles","timespan","roundsonentries","round","same"].includes(activeTab) && l === "D") return false;
    return true;
  });

  useEffect(() => {
    const surfaces = searchParams.getAll("surface");
    const levels = searchParams.getAll("level");
    const rounds = searchParams.get("round");
    const bestOf = searchParams.get("bestOf") ? Number(searchParams.get("bestOf")) : null;

    setSelectedSurfaces(new Set(surfaces));
    setSelectedLevels(new Set(levels));

    setSelectedRounds(rounds || "");
    setSelectedBestOf(bestOf);
  }, [searchParams, activeTab, activeSubTab]);

  useEffect(() => {
    const params = new URLSearchParams();
    Array.from(selectedSurfaces).sort().forEach(s => params.append("surface", s));
    Array.from(selectedLevels).sort().forEach(l => params.append("level", l));
    if (selectedRounds) params.set("round", selectedRounds);
    if (selectedBestOf !== null) params.set("bestOf", selectedBestOf.toString());

    // Preserve incoming tab/subtab value but normalize to use only `subtab` in the URL
    // If an older client provided `tab` we convert it to `subtab` and do NOT write `tab`.
    const incomingTabKey = searchParams.has("subtab") ? "subtab" : (searchParams.has("tab") ? "tab" : null);
    let incomingSubtab: string | null = null;
    if (incomingTabKey) {
      const incomingValue = searchParams.get(incomingTabKey);
      if (incomingValue) {
        // Normalize to canonical `subtab` key only
        params.set("subtab", incomingValue);
        incomingSubtab = incomingValue;
      }
    }
    // NOTE: do NOT write activeSubTab as a default into the URL here,
    // to avoid overwriting a subtab coming from another client.
    // The Tabs component should write the subtab when the user explicitly selects one.

    // Remove any legacy `record` and `tab` params from the query params - we'll encode them in the pathname/subtab
    params.delete("record");
    params.delete("tab");

    const canonicalize = (uParams: URLSearchParams) => {
      const map = new Map<string, string[]>();
      for (const [k, v] of uParams.entries()) {
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(v);
      }
      const parts: string[] = [];
      const keys = Array.from(map.keys()).sort();
      for (const k of keys) {
        const vals = map.get(k)!.slice().sort();
        for (const v of vals) parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
      }
      return parts.join("&");
    };

    const newCanon = canonicalize(params);
    const currentCanon = canonicalize(new URLSearchParams(window.location.search));
    const newPath = `/records/${encodeURIComponent(activeTab)}${incomingSubtab ? `/${encodeURIComponent(incomingSubtab)}` : ""}`;

    const desiredSearch = newCanon ? `?${newCanon}` : "";
    const desiredHref = `${window.location.origin}${newPath}${desiredSearch}`;

    const debugMode = new URLSearchParams(window.location.search).has("__debug");
    if (debugMode) {
      console.log("[filters-debug] effect start", {
        selectedSurfaces: Array.from(selectedSurfaces).sort(),
        selectedLevels: Array.from(selectedLevels).sort(),
        selectedRounds,
        selectedBestOf,
        incomingSearch: window.location.search,
      });
      console.log("[filters-debug] desiredHref:", desiredHref);
      console.log("[filters-debug] currentHref:", window.location.href);
      console.log("[filters-debug] newCanon:", newCanon, "currentCanon:", currentCanon);
    }

    // If the full href already matches, nothing to do
    if (window.location.href === desiredHref) {
      if (debugMode) console.log("[filters-debug] hrefs equal - skip replace");
      return;
    }

    // Compare current filter values as sets to avoid replacing when values already match
    const currentParams = new URLSearchParams(window.location.search);
    const setFromParams = (key: string) => new Set(currentParams.getAll(key));
    const currentSurfaces = setFromParams("surface");
    const currentLevels = setFromParams("level");
    const currentRound = currentParams.get("round") || "";
    const currentBestOf = currentParams.get("bestOf") ? Number(currentParams.get("bestOf")) : null;

    const setsEqual = (a: Set<string>, b: Set<string>) => {
      if (a.size !== b.size) return false;
      for (const x of a) if (!b.has(x)) return false;
      return true;
    };

    // Check sessionStorage to avoid repeating a normalization across navigations/remounts
    let storedCanon: string | null = null;
    try {
      storedCanon = sessionStorage.getItem(STORAGE_KEY);
      if (debugMode) console.log("[filters-debug] storedCanon:", storedCanon);
    } catch (e) {
      if (debugMode) console.warn("[filters-debug] sessionStorage unavailable", e);
    }

    if (window.location.pathname === newPath && setsEqual(currentSurfaces, selectedSurfaces) && setsEqual(currentLevels, selectedLevels) && currentRound === selectedRounds && currentBestOf === selectedBestOf) {
      // If the canonical strings differ (ordering/canonicalization), do a single replace to normalize, otherwise skip
      if (currentCanon === newCanon) {
        if (debugMode) console.log("[filters-debug] values equal and canon equal - skip replace");
        return;
      }

      // If we've already stored that we applied this canonicalization, skip doing it again
      if (storedCanon === newCanon) {
        if (debugMode) console.log("[filters-debug] canon already normalized in session - skip replace");
        return;
      }

      if (debugMode) console.log("[filters-debug] values equal but canon differs - normalizing once");

      try {
        sessionStorage.setItem(STORAGE_KEY, newCanon);
      } catch (e) {
        if (debugMode) console.warn("[filters-debug] failed to write sessionStorage", e);
      }

      lastAppliedQS.current = newCanon;
      router.replace(newPath + desiredSearch);
      return;
    }

    // Avoid repeating the same replacement multiple times
    if (lastAppliedQS.current === newCanon || storedCanon === newCanon) {
      if (debugMode) console.log("[filters-debug] already applied canonical qs - skip");
      return;
    }

    // Apply replacement once and remember it *before* calling replace to avoid loops
    try {
      sessionStorage.setItem(STORAGE_KEY, newCanon);
    } catch (e) {
      if (debugMode) console.warn("[filters-debug] failed to write sessionStorage", e);
    }
    lastAppliedQS.current = newCanon;
    if (debugMode) console.log("[filters-debug] performing replace ->", newPath + desiredSearch);
    router.replace(newPath + desiredSearch);
  }, [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, activeTab, activeSubTab, searchParams, router]);

  const selectSurface = (surface: string) => setSelectedSurfaces(new Set([surface]));
  const selectLevel = (level: string) => setSelectedLevels(new Set([level]));

  return (
    <div className="mb-4 text-gray-100">
      {showSurfaces && (
        <fieldset className="mb-4 p-4 rounded-xl border border-gray-600 bg-gray-900">
          <legend className="text-lg font-semibold mb-3 text-white px-2">Surface</legend>
          <div className="flex flex-wrap gap-3">
            <FilterButton
              isActive={selectedSurfaces.size === 0}
              onClick={() => setSelectedSurfaces(new Set())}
            >
              All
            </FilterButton>
            {SURFACE_LIST.map(surface => (
              <FilterButton
                key={surface}
                isActive={selectedSurfaces.has(surface)}
                onClick={() => selectSurface(surface)}
              >
                {surfaceEmojis[surface]} {surface}
              </FilterButton>
            ))}
          </div>
        </fieldset>
      )}

      {showLevels && (
        <fieldset className="mb-4 p-4 rounded-xl border border-gray-600 bg-gray-900">
          <legend className="text-lg font-semibold mb-3 text-white px-2">Level</legend>
          <div className="flex flex-wrap gap-3">
            <FilterButton
              isActive={selectedLevels.size === 0}
              onClick={() => setSelectedLevels(new Set())}
            >
              All
            </FilterButton>
            {filteredLevelList.map(level => (
              <FilterButton
                key={level}
                isActive={selectedLevels.has(level)}
                onClick={() => selectLevel(level)}
              >
                {levelNames[level] || level}
              </FilterButton>
            ))}
          </div>
        </fieldset>
      )}

      {showRounds && (
        <fieldset className="mb-4 p-4 rounded-xl border border-gray-600 bg-gray-900">
          <legend className="text-lg font-semibold mb-3 text-white px-2">Rounds</legend>
          <div className="flex flex-wrap gap-3">
            {showAllRounds && (
              <FilterButton
                isActive={selectedRounds === ""}
                onClick={() => setSelectedRounds("")}
              >
                All
              </FilterButton>
            )}
            {ROUND_LIST.map(round => (
              <FilterButton
                key={round}
                isActive={selectedRounds === round}
                onClick={() => setSelectedRounds(round)}
              >
                {round}
              </FilterButton>
            ))}
          </div>
        </fieldset>
      )}

      {showBestOf && (
        <fieldset className="p-4 rounded-xl border border-gray-600 bg-gray-900">
          <legend className="text-lg font-semibold mb-3 text-white px-2">Best Of</legend>
          <div className="flex flex-wrap gap-3">
            <FilterButton
              isActive={selectedBestOf === null}
              onClick={() => setSelectedBestOf(null)}
            >
              All
            </FilterButton>
            {BEST_OF_LIST.map(bestOf => (
              <FilterButton
                key={bestOf}
                isActive={selectedBestOf === bestOf}
                onClick={() => setSelectedBestOf(bestOf)}
              >
                {bestOf}
              </FilterButton>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
