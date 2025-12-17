"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

import Count from "./Count/page";
import Top from "./Top/page";
import Streak from "./Streak/page";
import StreakCount from "./Streak/Count/page";
import StreakTop from "./Streak/Top/page";
import EndSeason from "./EndOfTheSeason/page";
import EndSeasonCount from "./EndOfTheSeason/Count/page";
import EndSeasonTop from "./EndOfTheSeason/Top/page";
import EndSeasonStreakCount from "./EndOfTheSeason/StreakCount/page";
import EndSeasonStreakTop from "./EndOfTheSeason/StreakTop/page";
import Ages from "./Ages/page";
import AgesEndofTheSeason from "./AgesEndOfTheSeason/page";
import AgesYoungestCount from "./Ages/YoungestCount/page";
import AgesOldestCount from "./Ages/OldestCount/page";
import AgesYoungestTop from "./Ages/YoungestTop/page";
import AgesOldestTop from "./Ages/OldestTop/page";
import AgesEOYYoungestCount from "./AgesEndOfTheSeason/YoungestCount/page";
import AgesEOYOldestCount from "./AgesEndOfTheSeason/OldestCount/page";
import AgesEOYYoungestTop from "./AgesEndOfTheSeason/YoungestTop/page";
import AgesEOYOldestTop from "./AgesEndOfTheSeason/OldestTop/page";
import Timespan from "./Timespan/page";
import TimespanCount from "./Timespan/TimespanCount/page";
import TimespanTop from "./Timespan/TimespanTop/page";

import TimespanCountEndOfTheSeason from "./TimespanEndOfTheSeason/TimespanCountEndOfTheSeason/page";
import TimespanTopEndOfTheSeason from "./TimespanEndOfTheSeason/TimespanTopEndOfTheSeason/page";
import MostPoints from "./MostPoints/page";
import MostPointsOverall from "./MostPoints/Overall/page";
import MostPointsEndOfTheSeason from "./MostPoints/EndOfTheSeason/page";
import DiffPointsOverall from "./DiffPoints/Overall/page";
import DiffPointsEndOfTheSeason from "./DiffPoints/EndOfTheSeason/page";

// --- Tipi principali ---
interface Tab {
  key: string;
  label: string;
  hasSubTabs?: boolean;
}

// Tipi sub-tab dinamici
type SubTabMap = {
  Streak: "Count" | "Top";
  EndSeason: "Count" | "Top" | "StreakCount" | "StreakTop";
  Ages: "YoungestCount" | "OldestCount" | "YoungestTop" | "OldestTop";
  AgesEndofTheSeason: "YoungestCount" | "OldestCount" | "YoungestTop" | "OldestTop";
  Timespan: "Count" | "Top";
  TimespanEndOfTheSeason: "Count" | "Top";
  MostPoints: "Overall" | "EndOfTheSeason";
  DiffPoints: "Overall" | "EndOfTheSeason";
};

// --- Tabs principali ---
const tabs: Tab[] = [
  { key: "Count", label: "No." },
  { key: "Top", label: "Top" },
  { key: "Streak", label: "Streak", hasSubTabs: true },
  { key: "EndSeason", label: "End of the Season", hasSubTabs: true },
  { key: "Ages", label: "Ages Overall", hasSubTabs: true },
  { key: "AgesEndofTheSeason", label: "Ages End of the Season", hasSubTabs: true },
  { key: "Timespan", label: "Timespan Overall", hasSubTabs: true },
  { key: "TimespanEndOfTheSeason", label: "Timespan End of the Season", hasSubTabs: true },
  { key: "MostPoints", label: "Most Points", hasSubTabs: true },
  { key: "DiffPoints", label: "Diff Points", hasSubTabs: true },
];

// --- Sub-tabs ---
const subTabsOptions: { [K in keyof SubTabMap]: { key: SubTabMap[K]; label: string }[] } = {
  Streak: [
    { key: "Count", label: "Count" },
    { key: "Top", label: "Top" },
  ],
  EndSeason: [
    { key: "Count", label: "Count" },
    { key: "Top", label: "Top" },
    { key: "StreakCount", label: "Streak Count" },
    { key: "StreakTop", label: "Streak Top" },
  ],
  Ages: [
    { key: "YoungestCount", label: "Youngest at No." },
    { key: "OldestCount", label: "Oldest at No." },
    { key: "YoungestTop", label: "Youngest at Top" },
    { key: "OldestTop", label: "Oldest at Top" },
  ],
  AgesEndofTheSeason: [
    { key: "YoungestCount", label: "Youngest at No. in the End of the Season" },
    { key: "OldestCount", label: "Oldest at No. in the End of the Season" },
    { key: "YoungestTop", label: "Youngest at Top in the End of the Season" },
    { key: "OldestTop", label: "Oldest at Top in the End of the Season" },
  ],
  Timespan: [
    { key: "Count", label: "Count" },
    { key: "Top", label: "Top" },
  ],
  TimespanEndOfTheSeason: [
    { key: "Count", label: "Count" },
    { key: "Top", label: "Top" },
  ],
  MostPoints: [
    { key: "Overall", label: "Overall" },
    { key: "EndOfTheSeason", label: "EndOfTheSeason" },
  ],
  DiffPoints: [
    { key: "Overall", label: "Overall" },
    { key: "EndOfTheSeason", label: "EndOfTheSeason" },
  ],
};

// --- SubTabs component ---
function SubTabs<K extends keyof SubTabMap>({
  items,
  active,
  setActive,
}: {
  items: { key: SubTabMap[K]; label: string }[];
  active: SubTabMap[K];
  setActive: (key: SubTabMap[K]) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="absolute top-full left-0 mt-1 bg-gray-800 rounded-2xl p-2 shadow-lg min-w-max z-20 flex flex-col gap-1"
    >
      {items.map((sub) => (
        <button
          key={sub.key}
          onClick={() => setActive(sub.key)}
          className={`px-4 py-2 rounded-xl text-left text-gray-300 hover:text-white hover:bg-gray-700 transition-colors duration-200 ${
            active === sub.key ? "bg-gray-700 text-white" : ""
          }`}
        >
          {sub.label}
        </button>
      ))}
    </motion.div>
  );
}

// --- Componente principale ---
export default function RecordsRankingPage() {
  type MainTabKey = typeof tabs[number]["key"];
  const [activeTab, setActiveTab] = useState<MainTabKey>("Count");

  // Stato sub-tab per ogni tab
  const [activeSubTabs, setActiveSubTabs] = useState<Partial<Record<keyof SubTabMap, string>>>({});
  const [hoverTab, setHoverTab] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Gestione click fuori
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setHoverTab(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sub-tab corrente del tab attivo
  const currentSubTab =
    (activeTab in activeSubTabs ? activeSubTabs[activeTab as keyof SubTabMap] : null) ||
    (subTabsOptions[activeTab as keyof SubTabMap]?.[0]?.key) ||
    activeTab;

  // Mappatura dinamica componenti
  const componentsMap: Record<string, Record<string, React.FC>> = {
    Count: { Count },
    Top: { Top },
    Streak: { Count: StreakCount, Top: StreakTop },
    EndSeason: { Count: EndSeasonCount, Top: EndSeasonTop, StreakCount: EndSeasonStreakCount, StreakTop: EndSeasonStreakTop },
    Ages: { YoungestCount: AgesYoungestCount, OldestCount: AgesOldestCount, YoungestTop: AgesYoungestTop, OldestTop: AgesOldestTop },
    AgesEndofTheSeason: { YoungestCount: AgesEOYYoungestCount, OldestCount: AgesEOYOldestCount, YoungestTop: AgesEOYYoungestTop, OldestTop: AgesEOYOldestTop },
    Timespan: { Count: TimespanCount, Top: TimespanTop },
    TimespanEndOfTheSeason: { Count: TimespanCountEndOfTheSeason, Top: TimespanTopEndOfTheSeason },
    MostPoints: { Overall: MostPointsOverall, EndOfTheSeason: MostPointsEndOfTheSeason },
    DiffPoints: { Overall: DiffPointsOverall, EndOfTheSeason: DiffPointsEndOfTheSeason },
  };

  const ActiveComponent = componentsMap[activeTab]?.[currentSubTab] || Count;

  return (
    <main ref={containerRef} className="w-full px-8 py-8 text-white bg-gray-900">
      <h1 className="mb-8 text-3xl font-bold text-center text-gray-100">Records Ranking</h1>

      {/* Barra dei tab */}
      <div className="relative mb-8 flex flex-wrap gap-3 bg-gray-800/40 rounded-2xl p-4 shadow-lg w-full justify-center">
        {tabs.map((tab) => (
          <div
            key={tab.key}
            className="relative"
            onMouseEnter={() => tab.hasSubTabs && setHoverTab(tab.key)}
            onMouseLeave={() => tab.hasSubTabs && setHoverTab(null)}
          >
            <button
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.hasSubTabs) setHoverTab(tab.key);
              }}
              onFocus={() => tab.hasSubTabs && setHoverTab(tab.key)}
              onBlur={() => tab.hasSubTabs && setHoverTab(null)}
              className={`relative px-4 py-2 rounded-2xl font-medium transition-colors duration-200 ${
                activeTab === tab.key ? "text-white" : "text-gray-300 hover:text-white"
              }`}
            >
              {activeTab === tab.key && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl shadow-md"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>

            <AnimatePresence>
              {tab.hasSubTabs && hoverTab === tab.key && (
                <SubTabs
                  items={subTabsOptions[tab.key as keyof SubTabMap]}
                  active={currentSubTab as any}
                  setActive={(subKey) =>
                    setActiveSubTabs((prev) => ({ ...prev, [tab.key]: subKey }))
                  }
                />
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Contenuto */}
      <div className="mt-6 w-full overflow-x-auto">
        <ActiveComponent />
      </div>
    </main>
  );
}
