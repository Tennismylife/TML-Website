'use client'

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

export default function TournamentTabs({
  activeTab,
  setActiveTab,
  activeAgeSubTab,
  setActiveAgeSubTab,
  activePercentageSubTab,
  setActivePercentageSubTab,
}: {
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  activeAgeSubTab: string;
  setActiveAgeSubTab: React.Dispatch<React.SetStateAction<string>>;
  activePercentageSubTab: string;
  setActivePercentageSubTab: React.Dispatch<React.SetStateAction<string>>;
}) {
  const [showAgesSubTabs, setShowAgesSubTabs] = useState(false);
  const [showPercentageSubTabs, setShowPercentageSubTabs] = useState(false);

  const agesRef = useRef<HTMLDivElement>(null);
  const percentageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (agesRef.current && !agesRef.current.contains(event.target as Node)) {
        setShowAgesSubTabs(false);
      }
      if (percentageRef.current && !percentageRef.current.contains(event.target as Node)) {
        setShowPercentageSubTabs(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tabs = [
    { key: "count", label: "Counts" },
    { key: "rounds", label: "Rounds" },
    { key: "ages", label: "Ages", hasSubTabs: true },
    { key: "percentage", label: "Percentages", hasSubTabs: true },
    { key: "timespan", label: "Timespans" },
    { key: "rounds-on-entries", label: "Rounds on Entries" },
    { key: "least", label: "Least" },
    { key: "average-age", label: "Average Age" },
  ];

  const agesSubTabs = [
    { key: "main", label: "Main Draw" },
    { key: "titles", label: "Titles" },
    { key: "youngestrounds", label: "Youngest per Round" },
    { key: "oldestrounds", label: "Oldest per Round" },
  ];

  const percentageSubTabs = [
    { key: "overall", label: "Overall Win %" },
    { key: "per-round", label: "Win % per Round" },
  ];

  const handleTabClick = (tabKey: string) => {
    if (tabKey === "ages") {
      setActiveTab("ages");
      setShowAgesSubTabs(true);
      setShowPercentageSubTabs(false);
      setActiveAgeSubTab("main"); // default sub-tab
    } else if (tabKey === "percentage") {
      setActiveTab("percentage");
      setShowPercentageSubTabs(true);
      setShowAgesSubTabs(false);
      setActivePercentageSubTab("overall"); // default sub-tab
    } else {
      setActiveTab(tabKey);
      setShowAgesSubTabs(false);
      setShowPercentageSubTabs(false);
    }
  };

  return (
    <div className="relative mb-6 flex flex-wrap gap-2 bg-gray-800/40 rounded-2xl p-2 shadow-lg">
      {tabs.map(tab => (
        <div
          key={tab.key}
          className="relative"
          ref={tab.key === "ages" ? agesRef : tab.key === "percentage" ? percentageRef : null}
          onMouseEnter={() => {
            if (tab.key === "ages") setShowAgesSubTabs(true);
            if (tab.key === "percentage") setShowPercentageSubTabs(true);
          }}
        >
          <button
            onClick={() => handleTabClick(tab.key)}
            className={`relative px-4 py-2 rounded-xl font-medium transition-colors duration-200
              ${activeTab === tab.key ? "text-white" : "text-gray-300 hover:text-white"}`}
          >
            {activeTab === tab.key && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-md"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>

          {tab.key === "ages" && showAgesSubTabs && (
            <div className="absolute mt-2 left-0 flex flex-col bg-gray-700/90 rounded-lg p-2 shadow-lg z-20">
              {agesSubTabs.map(sub => (
                <button
                  key={sub.key}
                  onClick={() => setActiveAgeSubTab(sub.key)}
                  className="px-4 py-2 rounded-full text-gray-200 hover:bg-gray-600 transition-all mb-1 last:mb-0"
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}

          {tab.key === "percentage" && showPercentageSubTabs && (
            <div className="absolute mt-2 left-0 flex flex-col bg-gray-700/90 rounded-lg p-2 shadow-lg z-20">
              {percentageSubTabs.map(sub => (
                <button
                  key={sub.key}
                  onClick={() => setActivePercentageSubTab(sub.key)}
                  className="px-4 py-2 rounded-full text-gray-200 hover:bg-gray-600 transition-all mb-1 last:mb-0"
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
