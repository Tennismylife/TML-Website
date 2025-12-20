"use client";

import { useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Profile from "./Profile";
import AllMatches from "./Matches/AllMatches";
import Seasons from "./Seasons/Seasons";
import Tournaments from "./Tournaments/Tournaments";
import H2H from "./H2H/H2H";
import Performance from "./Performance/Performance";
import Statistics from "./Statistics/Statistics";
import { Player } from "@/types";

interface Tab {
  id: string;
  label: string;
}

interface PlayerTabsProps {
  player: Player;
  tabs: Tab[];
  initialTab?: string;
  // lifted state hooks
  setTab?: (tabId: string) => void;
  tournamentsFilters?: any;
  setTournamentsFilters?: (f: any) => void;
  h2hFilters?: any;
  setH2HFilters?: (f: any) => void;
}

export default function PlayerTabs({ player, tabs, initialTab, setTab, tournamentsFilters, setTournamentsFilters, h2hFilters, setH2HFilters }: PlayerTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");

  const activeTab = useMemo(() => {
    const tab = tabParam || initialTab || "profile";
    return tabs.some(t => t.id === tab) ? tab : "profile";
  }, [tabParam, initialTab, tabs]);

  const lastNavRef = useRef<{ url: string; t: number } | null>(null);

  const handleTabClick = (tabId: string) => {
    // Build a new query string based on current search params
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("tab", tabId);
    if (tabId !== "tournaments") params.delete("sub");

    const newQs = params.toString();
    const currentQs = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";

    // Avoid triggering navigation if nothing actually changed
    if (newQs === currentQs) {
      // dev: log suppressed navigation
      // eslint-disable-next-line no-console
      console.debug('[PlayerTabs] handleTabClick: no-op navigation suppressed (qs unchanged)');
      return;
    }

    const newUrl = `${window.location.pathname}${newQs ? `?${newQs}` : ""}`;

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

    // Use lifted setter if available to centralize URL updates
    if (setTab) {
      setTab(tabId);
    } else {
      router.push(newUrl, { scroll: false });
    }
  };

  const content = useMemo(() => {
    switch (activeTab) {
      case "profile":
        return <Profile player={player} />;
      case "matches":
        return <AllMatches playerId={player.id} />;
      case "season":
        return <Seasons playerId={player.id} />;
      case "tournaments":
        return <Tournaments playerId={player.id} filters={tournamentsFilters} setFilters={setTournamentsFilters} />;
      case "h2h":
        return (
          <H2H
            playerId={player.id}
            mainPlayerName={player.atpname ?? player.id}
            filters={h2hFilters}
            setFilters={setH2HFilters}
          />
        );
      case "performance":
        return <Performance playerId={player.id} />;
      case "statistics":
        return <Statistics playerId={player.id} />;
      default:
        return null;
    }
  }, [activeTab, player, tournamentsFilters, setTournamentsFilters, h2hFilters, setH2HFilters]);

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
        className="sticky top-16 z-10 w-full bg-gray-800/95 backdrop-blur-md border-b border-gray-700 py-2 px-4"
        onKeyDown={handleKeyDown}
      >
        <div className="flex flex-wrap gap-2" role="tablist">
          {tabs.map(({ id, label }) => {
            const selected = activeTab === id;
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

      {/* Tab content */}
      <div className="flex-1 w-full bg-gray-900">
        <div className="w-full py-6">
          {content}
        </div>
      </div>
    </div>
  );
}
