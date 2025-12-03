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
    const tabParam = searchParams.get("tab") || initialTab || "profile";
    return tabs.some(t => t.id === tabParam) ? tabParam : "profile";
  }, [searchParams, initialTab, tabs]);

  const handleTabClick = (tabId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tabId);
    // reset subtab to default if switching main tab
    if (tabId !== "tournaments") url.searchParams.delete("sub");
    router.push(url.toString());
  };

  const renderTabContent = useMemo(() => {
    switch (activeTab) {
      case "profile": return <Profile player={player} />;
      case "matches": return <AllMatches playerId={player.id} />;
      case "season": return <Seasons playerId={player.id} />;
      case "tournaments": return <Tournaments playerId={player.id} />;
      case "h2h": {
        const mainPlayerName =
          (player as any).name ||
          (player as any).fullName ||
          `${(player as any).firstName ?? ""} ${(player as any).lastName ?? ""}`.trim() ||
          player.id;
        return <H2H playerId={player.id} mainPlayerName={mainPlayerName} />;
      }
      case "performance": return <Performance playerId={player.id} />;
      case "statistics": return <Statistics playerId={player.id} />;
      default: return null;
    }
  }, [activeTab, player]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    let nextIndex = currentIndex;
    if (e.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    else if (e.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    handleTabClick(tabs[nextIndex].id);
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div
        className="sticky top-16 z-10 w-full bg-gray-800/95 backdrop-blur-md border-b border-gray-700"
        role="tablist"
        onKeyDown={handleKeyDown}
      >
        <div className="flex gap-2 p-2">
          {tabs.map(({ id, label }) => {
            const selected = activeTab === id;
            return (
              <button
                key={id}
                id={`tab-${id}`}
                role="tab"
                tabIndex={selected ? 0 : -1}
                aria-selected={selected}
                aria-controls={`tabpanel-${id}`}
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

      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="flex-1 w-full h-full overflow-hidden bg-gray-900"
      >
        {renderTabContent}
      </div>
    </div>
  );
}
