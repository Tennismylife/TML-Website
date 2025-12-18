"use client";

import { useMemo } from "react";
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
}

export default function PlayerTabs({ player, tabs, initialTab }: PlayerTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTab = useMemo(() => {
    const tab = searchParams.get("tab") || initialTab || "profile";
    return tabs.some(t => t.id === tab) ? tab : "profile";
  }, [searchParams, initialTab, tabs]);

  const handleTabClick = (tabId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tabId);
    if (tabId !== "tournaments") url.searchParams.delete("sub");
    router.push(url.toString(), { scroll: false });
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
        return <Tournaments playerId={player.id} />;
      case "h2h":
        return (
          <H2H
            playerId={player.id}
            mainPlayerName={player.atpname ?? player.id}
          />
        );
      case "performance":
        return <Performance playerId={player.id} />;
      case "statistics":
        return <Statistics playerId={player.id} />;
      default:
        return null;
    }
  }, [activeTab, player]);

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
        className="sticky top-16 z-10 w-full bg-gray-800/95 backdrop-blur-md border-b border-gray-700 py-2 px-0"
        onKeyDown={handleKeyDown}
      >
        <div className="w-full flex gap-2" role="tablist">
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
