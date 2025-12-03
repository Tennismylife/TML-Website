"use client";

import React, { useState, use } from "react"; // Add use to imports
import Link from "next/link";
import CountSection from "./CountSection";
import RoundsSection from "./RoundsSection";
import AgesSection from "./AgesSection";
import PercentageSection from "./PercentageSection";
import RoundOnEntriesSection from "./RoundOnEntriesSection";
import FiltersComponent from "./FiltersComponent";
import { motion } from "framer-motion";

export default function SeasonRecordsPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = use(params); // Unwrap the Promise

  const [activeTab, setActiveTab] = useState<
    | "count"
    | "rounds"
    | "ages-main"
    | "ages-youngest"
    | "ages-oldest"
    | "ages-titles"
    | "percentage-overall"
    | "percentage-rounds"
    | "rounds-on-entries"
  >("count");

  const [showAgesSubTabs, setShowAgesSubTabs] = useState(false);
  const [showPercentageSubTabs, setShowPercentageSubTabs] = useState(false);

  const tabs = [
    { key: "count", label: "Count" },
    { key: "rounds", label: "Rounds" },
    { key: "ages", label: "Ages", hasSubTabs: true },
    { key: "percentage", label: "Percentage", hasSubTabs: true },
    { key: "rounds-on-entries", label: "Rounds on Entries" },
  ];

  const agesSubTabs = [
    { key: "ages-main", label: "Main Draw" },
    { key: "ages-titles", label: "Titles" },
    { key: "ages-youngest", label: "Youngest Per Round" },
    { key: "ages-oldest", label: "Oldest Per Round" },
  ];

  const percentageSubTabs = [
    { key: "percentage-overall", label: "Overall Win %" },
    { key: "percentage-rounds", label: "Win % per Round" },
  ];

  const handleTabClick = (tabKey: string) => {
    if (tabKey === "ages") {
      setActiveTab("ages-main"); // default sub-tab
      setShowAgesSubTabs(true);
      setShowPercentageSubTabs(false);
    } else if (tabKey === "percentage") {
      setActiveTab("percentage-overall"); // default sub-tab
      setShowPercentageSubTabs(true);
      setShowAgesSubTabs(false);
    } else {
      setActiveTab(tabKey as typeof activeTab);
      setShowAgesSubTabs(false);
      setShowPercentageSubTabs(false);
    }
  };

  // --- Filtri persistenti ---
  const [selectedSurfaces, setSelectedSurfaces] = useState<Set<string>>(new Set());
  const [selectedLevels, setSelectedLevels] = useState<string>("");

  // Default surfaces list
  const surfaces = ["Hard", "Clay", "Grass", "Carpet"];

  // --- Render tab content ---
  const renderTabContent = () => {
    switch (activeTab) {
      case "count":
        return (
          <CountSection year={year} selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} />
        );
      case "rounds":
        return (
          <RoundsSection year={year} selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} />
        );
      case "ages-main":
        return (
          <AgesSection
            year={year}
            selectedSurfaces={selectedSurfaces}
            selectedLevels={selectedLevels}
            activeSubTab="main"
          />
        );
      case "ages-youngest":
        return (
          <AgesSection
            year={year}
            selectedSurfaces={selectedSurfaces}
            selectedLevels={selectedLevels}
            activeSubTab="youngest"
          />
        );
      case "ages-oldest":
        return (
          <AgesSection
            year={year}
            selectedSurfaces={selectedSurfaces}
            selectedLevels={selectedLevels}
            activeSubTab="oldest"
          />
        );
      case "ages-titles":
        return (
          <AgesSection
            year={year}
            selectedSurfaces={selectedSurfaces}
            selectedLevels={selectedLevels}
            activeSubTab="titles"
          />
        );
      case "percentage-overall":
      case "percentage-rounds":
        return (
          <PercentageSection
            year={year}
            selectedSurfaces={selectedSurfaces}
            selectedLevels={selectedLevels}
            activeSubTab={activeTab === "percentage-overall" ? "overall" : "rounds"}
          />
        );
      case "rounds-on-entries":
        return (
          <RoundOnEntriesSection
            year={year}
            selectedSurfaces={selectedSurfaces}
            selectedLevels={selectedLevels}
          />
        );
      default:
        return null;
    }
  };

  return (
    <main className="w-full mx-auto p-8 text-white">
      <>
        {/* Tabs */}
        <div className="relative mb-6 flex flex-wrap gap-2 bg-gray-800/40 rounded-2xl p-2 shadow-lg">
          {tabs.map((tab) => (
            <div
              key={tab.key}
              className="relative"
              onMouseEnter={() => {
                if (tab.key === "ages") setShowAgesSubTabs(true);
                if (tab.key === "percentage") setShowPercentageSubTabs(true);
              }}
              onMouseLeave={() => {
                if (tab.key === "ages") setShowAgesSubTabs(false);
                if (tab.key === "percentage") setShowPercentageSubTabs(false);
              }}
            >
              <button
                onClick={() => handleTabClick(tab.key)}
                className={`relative px-4 py-2 rounded-xl font-medium transition-colors duration-200 ${
                  activeTab === tab.key || activeTab.startsWith(tab.key + "-")
                    ? "text-white"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                {(activeTab === tab.key || activeTab.startsWith(tab.key + "-")) && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-md"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>

              {/* Ages Sub-tabs */}
              {tab.key === "ages" && showAgesSubTabs && (
                <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-xl p-2 shadow-lg z-20 min-w-max">
                  {agesSubTabs.map((subTab) => (
                    <button
                      key={subTab.key}
                      onClick={() => setActiveTab(subTab.key as typeof activeTab)}
                      className="block w-full text-left px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Percentage Sub-tabs */}
              {tab.key === "percentage" && showPercentageSubTabs && (
                <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-xl p-2 shadow-lg z-20 min-w-max">
                  {percentageSubTabs.map((subTab) => (
                    <button
                      key={subTab.key}
                      onClick={() => setActiveTab(subTab.key as typeof activeTab)}
                      className="block w-full text-left px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Filters */}
        <FiltersComponent
          selectedSurfaces={selectedSurfaces}
          setSelectedSurfaces={setSelectedSurfaces}
          selectedLevels={selectedLevels}
          setSelectedLevels={setSelectedLevels}
          surfaceList={surfaces}
        />

        {/* Tab Content */}
        <div className="mt-4">{renderTabContent()}</div>
      </>
    </main>
  );
}
