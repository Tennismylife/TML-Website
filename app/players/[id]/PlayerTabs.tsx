"use client";

import { useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Profile from "./Profile";
import AllMatches from "./Matches/AllMatches";
import Seasons from "./season/components/Seasons";
import SurfaceStatsClient from "./season/components/SurfaceStatsClient";
import Tournaments from "./Tournaments/Tournaments";
import H2H from "./H2H/H2H";
import Performance from "./Performance/Performance";
import Statistics from "./Statistics/Statistics";
import RankHistory from "./Ranking/RankHistory";
import { Player } from "@/types";

interface Tab {
  id: string;
  label: string;
}

interface PlayerTabsProps {
  player: Player;
  tabs: Tab[];
  initialTab?: string;
  // server-supplied node rendered just below tabs
  banner?: React.ReactNode;
  // server-rendered ranking narrative (SSR prose for Google)
  rankingNarrative?: React.ReactNode;
  // lifted state hooks
  setTab?: (tabId: string) => void;
  tournamentsFilters?: any;
  setTournamentsFilters?: (f: any) => void;
  h2hFilters?: any;
  setH2HFilters?: (f: any) => void;
  initialMatches?: any[];
  initialHeading?: string;
  initialTotals?: { totalWins?: number; totalLosses?: number };
  initialFacets?: any;
  initialSeasonStats?: any;
  initialSeasonYear?: number | null;
  initialSeasonMatches?: any[];
  initialSeasonYears?: number[];
}

export default function PlayerTabs({ player, tabs, initialTab, banner, rankingNarrative, setTab, tournamentsFilters, setTournamentsFilters, h2hFilters, setH2HFilters, initialMatches, initialHeading, initialTotals, initialFacets, initialSeasonStats, initialSeasonYear, initialSeasonMatches, initialSeasonYears }: PlayerTabsProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // derive tab from pathname (/players/:slug/:tab) or fall back to initialTab
  const pathTab = typeof pathname === 'string' ? pathname.split('/')[3] : null;
  const SURFACE_TABS = new Set(['clay', 'hard', 'grass']);

  const activeTab = useMemo(() => {
    const tab = (pathTab || initialTab || "profile").toLowerCase();
    if (SURFACE_TABS.has(tab)) return tab;
    return tabs.some(t => t.id === tab) ? tab : "profile";
  }, [pathTab, initialTab, tabs]);

  const lastNavRef = useRef<{ url: string; t: number } | null>(null);

  const handleTabClick = (tabId: string) => {
    // "Surface Stats" tab defaults to hard court
    if (tabId === 'surfaces') { tabId = 'hard'; }
    // Build a new query string based on current search params (preserve filters, but don't use ?tab=)
    const params = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
    // Only keep 'sub' for season. If navigating to 'season' and no 'sub' present, restore last-seen season sub if available
    if (tabId !== "season") {
      params.delete("sub");
    } else {
      if (!params.has("sub") && typeof window !== 'undefined') {
        const last = (window as any).__player_last_season_sub;
        if (last) params.set("sub", last);
      }
    }

    const newQs = params.toString();
    const currentQs = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";

    // Build new pathname with tab as segment (remove extra trailing segments like an encoded year)
    const parts = typeof window !== 'undefined' ? window.location.pathname.split('/') : ['','players','','matches'];
    // Keep only the first 4 segments: ['', 'players', ':slug', ':tab'] to avoid preserving trailing year or other segments
    const baseParts = parts.slice(0, 4);
    baseParts[3] = tabId;
    let newPathname = baseParts.join('/');

    // For season tab: always navigate directly to /season/YYYY to avoid the intermediate redirect
    if (tabId === 'season') {
      const defaultYear = initialSeasonYears?.[0] ?? new Date().getFullYear();
      newPathname = `${newPathname}/${defaultYear}`;
    }

    // Avoid triggering navigation if nothing actually changed (both pathname and qs)
    if (newQs === currentQs && newPathname === window.location.pathname) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('[PlayerTabs] handleTabClick: no-op navigation suppressed (pathname+qs unchanged)');
      }
      return;
    }

    const newUrl = `${newPathname}${newQs ? `?${newQs}` : ""}`;

    // Suppress duplicate navigations within 2000ms
    const now = Date.now();
    if (lastNavRef.current?.url === newUrl && now - lastNavRef.current.t < 2000) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('[PlayerTabs] suppressed duplicate nav', newUrl);
      }
      return;
    }

    lastNavRef.current = { url: newUrl, t: now };

    // dev: log navigation
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[PlayerTabs] navigate to', newUrl);
    }

    // Use lifted setter to update client state and always navigate to the canonical path immediately
    if (setTab) {
      setTab(tabId);
    }
    // Set a short-lived flag so other client-side URL-syncers don't overwrite explicit navigation
    if (typeof window !== 'undefined') (window as any).__player_navigation_recent = Date.now();
    // Navigate immediately to the canonical path to avoid race conditions
    router.push(newUrl, { scroll: false });
  };

  let content: ReactNode = null;
  switch (activeTab) {
    case "profile":
      content = <Profile player={player} />;
      break;
    case "matches":
      content = <AllMatches playerId={player.id} playerSlug={player.slug} initialMatches={initialMatches} initialHeading={initialHeading} initialTotals={initialTotals} initialFacets={initialFacets} />;
      break;
    case "season":
      content = (
        <Seasons
          playerId={player.id}
          playerSlug={player.slug}
          playerName={player.atpname ?? player.player ?? player.id}
          initialSelectedYear={initialSeasonYear ?? undefined}
          initialAllMatches={initialSeasonMatches}
          initialYears={initialSeasonYears}
          initialSeasonStats={initialSeasonStats}
          initialSeasonYear={initialSeasonYear}
        />
      );
      break;
    case "tournaments":
      content = <Tournaments playerId={player.id} filters={tournamentsFilters} setFilters={setTournamentsFilters} />;
      break;
    case "h2h":
      content = (
        <H2H
          playerId={player.id}
          mainPlayerName={player.atpname ?? player.id}
          filters={h2hFilters}
          setFilters={setH2HFilters}
        />
      );
      break;
    case "performance":
      content = <Performance playerId={player.id} />;
      break;
    case "statistics":
      content = <Statistics playerId={player.id} />;
      break;
    case "ranking":
      content = <RankHistory playerId={player.id} birthdate={player.birthdate ? String(player.birthdate) : undefined} narrativeSlot={rankingNarrative} />;
      break;
    case "clay":
    case "hard":
    case "grass": {
      const surfaceMap: Record<string, string> = { clay: 'Clay', hard: 'Hard', grass: 'Grass' };
      const surfaceKey = surfaceMap[activeTab] ?? activeTab;
      content = (
        <SurfaceStatsClient
          playerId={player.id}
          playerSlug={player.slug}
          playerName={player.atpname ?? player.player ?? player.id}
          surface={surfaceKey}
        />
      );
      break;
    }
    default:
      content = null;
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex(t => t.id === activeTab);
    if (e.key === "ArrowRight")
      handleTabClick(tabs[(index + 1) % tabs.length].id);
    if (e.key === "ArrowLeft")
      handleTabClick(tabs[(index - 1 + tabs.length) % tabs.length].id);
  };

  return (
    <div className="flex flex-col w-full h-full">
      {/* Tab bar */}
      <div
        className="sticky top-16 z-10 w-full bg-gray-800 border-b border-gray-700 py-2 px-4"
        onKeyDown={handleKeyDown}
      >
        <div className="flex flex-wrap gap-2" role="tablist">
          {tabs.map(({ id, label }) => {
            const selected = activeTab === id || (id === 'surfaces' && SURFACE_TABS.has(activeTab));
            if (id === 'surfaces') {
              return (
                <div key={id} className="group flex flex-col items-start gap-1">
                  <button
                    role="tab"
                    aria-selected={selected}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => handleTabClick(id)}
                    className={`px-3 py-2 rounded-md transition-all duration-300 focus:outline-none ${
                      selected
                        ? "font-semibold border-b-2 border-yellow-400 text-white"
                        : "text-gray-400 hover:text-yellow-400"
                    }`}
                  >
                    {label}
                  </button>
                  <div className={`flex gap-4 ${selected ? 'flex' : 'hidden'} group-hover:flex`}>
                    {[{ key: 'hard', label: 'Hard' }, { key: 'clay', label: 'Clay' }, { key: 'grass', label: 'Grass' }].map(({ key, label: slabel }) => (
                        <button
                          key={key}
                          onClick={() => handleTabClick(key)}
                          className={`px-3 py-1 rounded-md ${
                            activeTab === key
                              ? 'text-white border-b-2 border-yellow-400'
                              : 'text-gray-400 hover:text-yellow-400'
                          }`}
                        >{slabel}</button>
                      ))}
                    </div>
                </div>
              );
            }
            return (
              <button
                key={id}
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => handleTabClick(id)}
                className={`px-3 py-2 rounded-md transition-all duration-300 focus:outline-none ${
                  selected
                    ? "font-semibold border-b-2 border-yellow-400 text-white"
                    : "text-gray-400 hover:text-yellow-400"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      {banner && activeTab === 'ranking' && (
        <div className="mt-2">
          {banner}
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 w-full bg-gray-900">
        <div className="w-full py-6">
          {content}
        </div>
      </div>
    </div>
  );
}
