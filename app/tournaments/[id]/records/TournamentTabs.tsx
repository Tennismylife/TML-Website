'use client'

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

type TabKey = 'count' | 'ages' | 'percentage' | 'timespan' | 'rounds-on-entries' | 'least' | 'average-age' | 'rounds';
type AgeSubTab = 'main' | 'titles' | 'youngestrounds' | 'oldestrounds';
type PercentageSubTab = 'overall' | 'per-round';

type Props = {
  activeTab: TabKey;
  setActiveTab: React.Dispatch<React.SetStateAction<TabKey>>;
  activeAgeSubTab: AgeSubTab;
  setActiveAgeSubTab: React.Dispatch<React.SetStateAction<AgeSubTab>>;
  activePercentageSubTab: PercentageSubTab;
  setActivePercentageSubTab: React.Dispatch<React.SetStateAction<PercentageSubTab>>;
};

export default function TournamentTabs({
  activeTab,
  setActiveTab,
  activeAgeSubTab,
  setActiveAgeSubTab,
  activePercentageSubTab,
  setActivePercentageSubTab,
}: Props) {
  const [hoverAges, setHoverAges] = useState(false);
  const [hoverPercentage, setHoverPercentage] = useState(false);

  const agesRef = useRef<HTMLDivElement>(null);
  const percentageRef = useRef<HTMLDivElement>(null);

  // Nascondi subtab se clicchi fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (agesRef.current && !agesRef.current.contains(event.target as Node)) {
        setHoverAges(false);
      }
      if (percentageRef.current && !percentageRef.current.contains(event.target as Node)) {
        setHoverPercentage(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'count', label: 'Counts' },
    { key: 'rounds', label: 'Rounds' },
    { key: 'ages', label: 'Ages' },
    { key: 'percentage', label: 'Percentages' },
    { key: 'timespan', label: 'Timespans' },
    { key: 'rounds-on-entries', label: 'Rounds on Entries' },
    { key: 'least', label: 'Least' },
    { key: 'average-age', label: 'Average Age' },
  ];

  const ageSubTabs: { key: AgeSubTab; label: string }[] = [
    { key: 'main', label: 'Main Draw' },
    { key: 'titles', label: 'Titles' },
    { key: 'youngestrounds', label: 'Youngest per Round' },
    { key: 'oldestrounds', label: 'Oldest per Round' },
  ];

  const percentageSubTabs: { key: PercentageSubTab; label: string }[] = [
    { key: 'overall', label: 'Overall Win %' },
    { key: 'per-round', label: 'Win % per Round' },
  ];

  return (
    <div className="relative mb-6 flex flex-wrap gap-2 bg-gray-800/40 rounded-2xl p-2 shadow-lg">
      {tabs.map((tab) => (
        <div
          key={tab.key}
          className="relative"
          ref={tab.key === 'ages' ? agesRef : tab.key === 'percentage' ? percentageRef : null}
          onMouseEnter={() => {
            if (tab.key === 'ages') setHoverAges(true);
            if (tab.key === 'percentage') setHoverPercentage(true);
          }}
        >
          <button
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2 rounded-xl font-medium transition-colors duration-200
              ${activeTab === tab.key ? 'text-white' : 'text-gray-300 hover:text-white'}`}
          >
            {activeTab === tab.key && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-md"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>

          {/* Subtab di Ages */}
          {tab.key === 'ages' && hoverAges && (
            <div className="absolute mt-2 left-0 flex flex-col bg-gray-700/90 rounded-lg p-2 shadow-lg z-20">
              {ageSubTabs.map(sub => (
                <button
                  key={sub.key}
                  onClick={() => {
                    setActiveAgeSubTab(sub.key);
                    setHoverAges(false);
                    setActiveTab('ages');
                  }}
                  className="px-4 py-2 rounded-full text-gray-200 hover:bg-gray-600 transition-all mb-1 last:mb-0"
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}

          {/* Subtab di Percentage */}
          {tab.key === 'percentage' && hoverPercentage && (
            <div className="absolute mt-2 left-0 flex flex-col bg-gray-700/90 rounded-lg p-2 shadow-lg z-20">
              {percentageSubTabs.map(sub => (
                <button
                  key={sub.key}
                  onClick={() => {
                    setActivePercentageSubTab(sub.key);
                    setHoverPercentage(false);
                    setActiveTab('percentage');
                  }}
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
