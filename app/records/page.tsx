"use client";

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";

import FiltersComponent from './FiltersComponent';
import Wins from './Wins/Wins';
import Played from './Played/Played';
import Count from './Count/Count';
import Titles from './Titles/Titles';
import Entries from './Entries/Entries';
import Timespan from './Timespan/Timespan';
import Ages from './Ages/Ages';
import Percentage from './Percentage/Percentage';
import Roundsonentries from './RoundsOnEntries/RoundsOnEntries';
import Seasons from './Seasons/Seasons';
import Same from './Same/Same';
import AtAge from './AtAge/AtAge';
import AgeofNth from './AgeofNth/AgeofNth';
import NeededToSection from './NeededTo/NeededTo';
import CounterSeasonsSection from './CounterSeasons/CounterSeasons';
import H2HSection from './H2H/H2H';
import StreakSection from './Streak/Streak';

interface RecordData {
  topWinners?: any[];
  topPlayed?: any[];
  top?: any[];
  topTitles?: any[];
  topEntries?: any[];
  surfaces?: string[];
  topRoundOnEntries?: any[];
  rounds?: string[];
  bestOf?: number[];
}

function RecordsMain() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<RecordData | null>(null);
  const [displayData, setDisplayData] = useState<RecordData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const [selectedSurfaces, setSelectedSurfaces] = useState<Set<string>>(new Set());
  const [selectedLevels, setSelectedLevels] = useState<Set<string>>(new Set());
  const [selectedRounds, setSelectedRounds] = useState<string>('');
  const [selectedBestOf, setSelectedBestOf] = useState<number | null>(null);

  // --- Sub-tabs state ---
  const [activeSubTabs, setActiveSubTabs] = useState<Record<string, string>>({
    ages: 'oldest',
    timespan: 'entries',
    roundsonentries: 'rounds',
    same: 'wins',
    seasons: 'wins',
    atage: 'wins',
    ageofnth: 'wins',
    neededto: 'titles',
    counterseasons: 'rounds',
    streak: 'wins',
    h2h: 'count',
  });

  const tabs = [
    { key: 'wins', label: 'Wins' },
    { key: 'played', label: 'Played' },
    { key: 'count', label: 'Count' },
    { key: 'titles', label: 'Titles' },
    { key: 'entries', label: 'Entries' },
    { key: 'ages', label: 'Ages' },
    { key: 'timespan', label: 'Timespan' },
    { key: 'percentage', label: 'Percentage' },
    { key: 'roundsonentries', label: 'Round on Entries' },
    { key: 'same', label: 'Same' },
    { key: 'seasons', label: 'Seasons' },
    { key: 'atage', label: 'At Age' },
    { key: 'ageofnth', label: 'Age of Nth' },
    { key: 'neededto', label: 'Needed To' },
    { key: 'counterseasons', label: 'Counter Seasons' },
    { key: 'h2h', label: 'H2H' },
    { key: 'streak', label: 'Streak' },
  ];

  const subTabs: Record<string, { key: string; label: string }[]> = {
    ages: [
      { key: "oldest", label: "Oldest Main Draw" },
      { key: "youngest", label: "Youngest Main Draw" },
      { key: "oldestWinners", label: "Oldest Winners" },
      { key: "youngestWinners", label: "Youngest Winners" },
    ],
    timespan: [
      { key: "entries", label: "2 entries" },
      { key: "titles", label: "2 titles" },
      { key: "rounds", label:"2 rounds" },
    ],
    roundsonentries: [
      { key: "titles", label: "Titles" },
      { key: "round", label: "Round" },
    ],
    same: [
      { key: "wins", label: "Wins" },
      { key: "played", label: "Played" },
      { key: "entries", label: "Entries" },
      { key: "titles", label: "Titles" },
      { key: "round", label: "Round" },
    ],
    seasons: [
      { key: "wins", label: "Wins" },
      { key: "played", label: "Played" },
      { key: "entries", label: "Entries" },
      { key: "titles", label: "Titles" },
      { key: "round", label: "Round" },
      { key: "percentage", label: "Percentage" },
    ],
    atage: [
      { key: "wins", label: "Wins" },
      { key: "played", label: "Played" },
      { key: "entries", label: "Entries" },
      { key: "titles", label: "Titles" },
      { key: "slams", label: "Slams" },
      { key: "round", label: "Round" },
    ],
    ageofnth: [
      { key: "wins", label: "Wins" },
      { key: "played", label: "Played" },
      { key: "entries", label: "Entries" },
      { key: "titles", label: "Titles" },
      { key: "slams", label: "Slams" },
      { key: "round", label: "Round" },
    ],
    neededto: [{ key: "titles", label: "Titles" }],
    counterseasons: [
      { key: "rounds", label: "Rounds" },
      { key: "titles", label: "Titles" },
    ],
    streak: [
      { key: "wins", label: "Wins" },
      { key: "round", label: "Round" },
    ],
    h2h: [{ key: "count", label: "Count" }],
  };

  // --- Init query params ---
  useEffect(() => {
    const recordParam = searchParams.get("record");
    if (recordParam) {
      setSelectedRecord(recordParam);
      setActiveTab(recordParam);
    }

    const surfaceParams = searchParams.getAll("surface");
    const levelParams = searchParams.getAll("level");
    const roundParam = searchParams.get("round");
    const bestOfParam = searchParams.get("bestOf");

    if (surfaceParams.length) setSelectedSurfaces(new Set(surfaceParams));
    if (levelParams.length) setSelectedLevels(new Set(levelParams));
    if (roundParam) setSelectedRounds(roundParam);
    if (bestOfParam) setSelectedBestOf(Number(bestOfParam));
  }, [searchParams]);

  // --- Update URL query ---
  useEffect(() => {
    if (!selectedRecord) return;
    const query = new URLSearchParams();
    query.set("record", selectedRecord);
    Array.from(selectedSurfaces).forEach(s => query.append("surface", s));
    Array.from(selectedLevels).forEach(l => query.append("level", l));
    if (selectedRounds) query.set("round", selectedRounds);
    if (selectedBestOf) query.set("bestOf", String(selectedBestOf));
    router.push(`/records?${query.toString()}`, { scroll: false });
  }, [selectedRecord, selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, router]);

  // --- Fetch data ---
  useEffect(() => {
    if (!selectedRecord) return;
    setLoading(true);
    const fetchData = async () => {
      try {
        if (!['percentage','ages','timespan','roundsonentries','same','seasons','atage','ageofnth','neededto','counterseasons','h2h','streak'].includes(selectedRecord)) {
          const query = new URLSearchParams();
          Array.from(selectedSurfaces).forEach(s => query.append('surface', s));
          Array.from(selectedLevels).forEach(l => query.append('level', l));
          if (selectedRounds) query.append('round', selectedRounds);
          if (selectedBestOf) query.set("bestOf", String(selectedBestOf));

          const res = await fetch(`/api/records/${selectedRecord}${query.toString() ? '?' + query.toString() : ''}`);
          if (!res.ok) throw new Error('Failed to fetch records');
          const fetchedData = await res.json();
          setData(fetchedData);
          setDisplayData(fetchedData);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedRecord, selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  const renderTabContent = () => {
    if (loading) return <div className="text-gray-500 italic mb-2">Loading...</div>;
    switch(selectedRecord) {
      case "wins": return <Wins/>;
      case "played": return <Played/>;
      case "count": return <Count selectedRounds={selectedRounds} top={displayData?.top} />;
      case "titles": return <Titles topTitles={displayData?.topTitles} />;
      case "entries": return <Entries />;
      case "ages": return <Ages selectedSurfaces={Array.from(selectedSurfaces)} selectedLevels={Array.from(selectedLevels)} selectedRounds={selectedRounds} activeSubTab={activeSubTabs.ages} />;
      case "timespan": return <Timespan selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedTab={activeSubTabs.timespan} onTabChange={(tab) => setActiveSubTabs(prev => ({...prev, timespan: tab}))} />;
      case "percentage": return <Percentage selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} />;
      case "roundsonentries": return <Roundsonentries selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} activeSubTab={activeSubTabs.roundsonentries} />;
      case "same": return <Same selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeSubTabs.same} />;
      case "seasons": return <Seasons selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeSubTabs.seasons} />;
      case "atage": return <AtAge selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeSubTabs.atage} />;
      case "ageofnth": return <AgeofNth selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeSubTabs.ageofnth} />;
      case "neededto": return <NeededToSection selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} activeSubTab={activeSubTabs.neededto} />;
      case "counterseasons": return <CounterSeasonsSection selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} activeSubTab={activeSubTabs.counterseasons} />;
      case "streak": return <StreakSection selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeSubTabs.streak} />;
      case "h2h": return <H2HSection selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeSubTabs.h2h} />;
      default: return null;
    }
  };

  return (
    <main className="w-full min-h-screen p-4 bg-gray-900 text-white">
      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 bg-gray-800/40 rounded-2xl p-2 shadow-lg">
        {tabs.map(tab => (
          <div key={tab.key} className="relative">
            <button
              onClick={() => { setSelectedRecord(tab.key); setActiveTab(tab.key); }}
              className={`relative px-4 py-2 rounded-xl font-medium transition-colors duration-200 ${activeTab === tab.key ? 'text-white' : 'text-gray-300 hover:text-white'}`}
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

            {/* Sub-tabs */}
{subTabs[tab.key] && activeTab === tab.key && (
  <div className="mt-2 flex flex-col gap-1">
    {subTabs[tab.key].map(st => (
      <button
        key={st.key}
        onClick={() => setActiveSubTabs(prev => ({ ...prev, [tab.key]: st.key }))}
        className={`px-3 py-1 rounded ${activeSubTabs[tab.key] === st.key ? "bg-gray-700 text-white" : "text-gray-300 hover:text-white hover:bg-gray-600"}`}
      >
        {st.label}
      </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Filters */}
      {selectedRecord && (
        <FiltersComponent
          selectedSurfaces={selectedSurfaces}
          setSelectedSurfaces={setSelectedSurfaces}
          selectedLevels={selectedLevels}
          setSelectedLevels={setSelectedLevels}
          selectedRounds={selectedRounds}
          setSelectedRounds={setSelectedRounds}
          selectedBestOf={selectedBestOf}
          setSelectedBestOf={setSelectedBestOf}
          activeTab={activeTab ?? ""}
          activeSubTab={activeSubTabs[activeTab ?? ""] ?? ""}
        />
      )}

      {/* Tab content */}
      <div className="w-full mt-4">{renderTabContent()}</div>

      {error && <div className="text-red-600 mt-2">Error: {error}</div>}
    </main>
  );
}

export default function RecordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading records...</div>}>
      <RecordsMain />
    </Suspense>
  );
}
