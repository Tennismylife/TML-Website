"use client";

import { Suspense, useState, useEffect } from 'react';
import Link from "next/link";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";

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
/* import Least from './Least/Least';
import FirstN from './FirstN/FirstN';
import Sets from './Sets/Sets';
 */
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

// Componente figlio che usa useSearchParams -> deve stare dentro Suspense
function RecordsMain() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<RecordData | null>(null);
  const [displayData, setDisplayData] = useState<RecordData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("entries");

  const [selectedSurfaces, setSelectedSurfaces] = useState<Set<string>>(new Set());
  const [selectedLevels, setSelectedLevels] = useState<Set<string>>(new Set());
  const [selectedRounds, setSelectedRounds] = useState<string>('');
  const [selectedBestOf, setSelectedBestOf] = useState<number | null>(null);

  // --- Sub-tabs state (omesso commenti per brevità) ---
  const [showAgesSubTabs, setShowAgesSubTabs] = useState(false);
  const [activeAgesSubTab, setActiveAgesSubTab] = useState("oldest");
  const [showTimespanSubTabs, setShowTimespanSubTabs] = useState(false);
  const [activeTimespanSubTab, setActiveTimespanSubTab] = useState("entries");
  const [showRoundsonentriesSubTabs, setShowRoundsonentriesSubTabs] = useState(false);
  const [activeRoundsonentriesSubTab, setActiveRoundsonentriesSubTab] = useState("rounds");
  const [showSameSubTabs, setShowSameSubTabs] = useState(false);
  const [activeSameSubTab, setActiveSameSubTab] = useState("wins");
  const [showSeasonsSubTabs, setShowSeasonsSubTabs] = useState(false);
  const [activeSeasonsSubTab, setActiveSeasonsSubTab] = useState("wins");
  const [showAtAgeSubTabs, setShowAtAgeSubTabs] = useState(false);
  const [activeAtAgeSubTab, setActiveAtAgeSubTab] = useState("wins");
  const [showAgeofNthSubTabs, setShowAgeofNthSubTabs] = useState(false);
  const [activeAgeofNthSubTab, setActiveAgeofNthSubTab] = useState("wins");
  const [showNeededToSubTabs, setShowNeededToSubTabs] = useState(false);
  const [activeNeededToSubTab, setActiveNeededToSubTab] = useState("titles");
  const [showCounterSeasonsSubTabs, setShowCounterSeasonsSubTabs] = useState(false);
  const [activeCounterSeasonsSubTab, setActiveCounterSeasonsSubTab] = useState("rounds");
  const [showStreakSubTabs, setShowStreakSubTabs] = useState(false);
  const [activeStreakSubTab, setActiveStreakSubTab] = useState("wins");
  const [showH2HSubTabs, setShowH2HSubTabs] = useState(false);
  const [activeH2HSubTab, setActiveH2HSubTab] = useState("count"); // unified name

  const tabs = [
    { key: 'wins', label: 'Wins' },
    { key: 'played', label: 'Played' },
    { key: 'count', label: 'Count' },
    { key: 'titles', label: 'Titles' },
    { key: 'entries', label: 'Entries' },
    { key: 'ages', label: 'Ages', hasSubTabs: true },
    { key: 'timespan', label: 'Timespan', hasSubTabs: true },
    { key: 'percentage', label: 'Percentage', hasSubTabs: true },
    { key: 'roundsonentries', label: 'Round on Entries', hasSubTabs: true },
    { key: 'same', label: 'Same', hasSubTabs: true },
    { key: 'seasons', label: 'Seasons', hasSubTabs: true },
    { key: 'atage', label: 'At Age', hasSubTabs: true },
    { key: 'ageofnth', label: 'Age of Nth', hasSubTabs: true },
    { key: 'neededto', label: 'Needed To', hasSubTabs: true },
    { key: 'counterseasons', label: 'Counter Seasons', hasSubTabs: true },
    { key: 'h2h', label: 'H2H' },
    { key: 'streak', label: 'Streak', hasSubTabs: true },
/*     { key: 'least', label: 'Least' },
    { key: 'firstn', label: 'First N' },
    { key: 'sets', label: 'Sets' }, */
  ];

  const agesSubTabs = [
    { key: "oldest", label: "Oldest Main Draw" },
    { key: "youngest", label: "Youngest Main Draw" },
    { key: "oldestWinners", label: "Oldest Winners" },
    { key: "youngestWinners", label: "Youngest Winners" },
  ];

  const timespanSubTabs = [
    { key: "entries", label: "2 entries" },
    { key: "titles", label: "2 titles" },
    { key: "rounds", label:" 2 rounds" },
  ];

  const roundsonentriesSubTabs = [
    { key: "titles", label: "Titles" },
    { key: "round", label: "Round" },
  ];

  const sameSubTabs = [
    { key: "wins", label: "Wins" },
    { key: "played", label: "Played" },
    { key: "entries", label: "Entries" },
    { key: "titles", label: "Titles" },
    { key: "round", label: "Round" },
  ];

  const seasonsSubTabs = [
    { key: "wins", label: "Wins" },
    { key: "played", label: "Played" },
    { key: "entries", label: "Entries" },
    { key: "titles", label: "Titles" },
    { key: "round", label: "Round" },
    { key: "percentage", label: "Percentage" },
  ];

  const atAgeSubTabs = [
    { key: "wins", label: "Wins" },
    { key: "played", label: "Played" },
    { key: "entries", label: "Entries" },
    { key: "titles", label: "Titles" },
    { key: "slams", label: "Slams" },
    { key: "round", label: "Round" },
  ];

  const ageofNthSubTabs = [
    { key: "wins", label: "Wins" },
    { key: "played", label: "Played" },
    { key: "entries", label: "Entries" },
    { key: "titles", label: "Titles" },
    { key: "slams", label: "Slams" },
    { key: "round", label: "Round" },
  ];

  const neededToSubTabs = [{ key: "titles", label: "Titles" }];

  const counterSeasonsSubTabs = [
    { key: "rounds", label: "Rounds" },
    { key: "titles", label: "Titles" },
  ];

  const streakSubTabs = [
    { key: "wins", label: "Wins" },
    { key: "round", label: "Round" },
  ];

  const h2hSubTabs = [
    { key: "count", label: "Count" },
  ];

  // --- Query params init ---
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
    const selectedBestOf = bestOfParam ? Number(bestOfParam) : null;

    if (surfaceParams.length) setSelectedSurfaces(new Set(surfaceParams));
    if (levelParams.length) setSelectedLevels(new Set(levelParams));
    if (roundParam) setSelectedRounds(roundParam);
    if (selectedBestOf) setSelectedBestOf(selectedBestOf);
  }, [searchParams]);

  // --- Update URL query when filters change ---
  useEffect(() => {
    if (!selectedRecord) return;

    const query = new URLSearchParams();
    query.set("record", selectedRecord);
    Array.from(selectedSurfaces).sort().forEach(s => query.append("surface", s));
    Array.from(selectedLevels).sort().forEach(l => query.append("level", l));
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
        if (!['percentage', 'sets', 'ages', 'timespan', 'roundsonentries', 'same', 'seasons', 'atage', 'ageofnth', 'neededto', 'counterseasons', 'h2h', 'streak'].includes(selectedRecord)) {
          const query = new URLSearchParams();
          Array.from(selectedSurfaces).forEach(s => query.append('surface', s));
          Array.from(selectedLevels).forEach(l => query.append('level', l));
          if (selectedRounds) query.append('round', selectedRounds);
          if (selectedBestOf) query.set("bestOf", String(selectedBestOf));

          const url = `/api/records/${selectedRecord}${query.toString() ? '?' + query.toString() : ''}`;
          const res = await fetch(url);
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

    if (selectedRecord === "ages") {
      switch (activeAgesSubTab) {
        case "oldest": return <Ages selectedSurfaces={Array.from(selectedSurfaces)} selectedLevels={Array.from(selectedLevels)} selectedRounds={selectedRounds} activeSubTab="oldest" />;
        case "youngest": return <Ages selectedSurfaces={Array.from(selectedSurfaces)} selectedLevels={Array.from(selectedLevels)} selectedRounds={selectedRounds} activeSubTab="youngest" />;
        case "oldestWinners": return <Ages selectedSurfaces={Array.from(selectedSurfaces)} selectedLevels={Array.from(selectedLevels)} selectedRounds={selectedRounds} activeSubTab="oldestWinners" />;
        case "youngestWinners": return <Ages selectedSurfaces={Array.from(selectedSurfaces)} selectedLevels={Array.from(selectedLevels)} selectedRounds={selectedRounds} activeSubTab="youngestWinners" />;
      }
    }

    if (selectedRecord === "roundsonentries") {
      return <Roundsonentries selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} activeSubTab={activeRoundsonentriesSubTab} />;
    }

    if (selectedRecord === "same") {
      return <Same selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeSameSubTab} />;
    }

    if (selectedRecord === "seasons") {
      return <Seasons selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeSeasonsSubTab} />;
    }

    if (selectedRecord === "atage") {
      return <AtAge selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeAtAgeSubTab} />;
    }

    if (selectedRecord === "ageofnth") {
      return <AgeofNth selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeAgeofNthSubTab} />;
    }

    if (selectedRecord === "neededto") {
      return <NeededToSection selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} activeSubTab={activeNeededToSubTab} />;
    }

    if (selectedRecord === "counterseasons") {
      return <CounterSeasonsSection selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} activeSubTab={activeCounterSeasonsSubTab} />;
    }

    if (selectedRecord === "streak") {
      return <StreakSection selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeStreakSubTab} />;
    }

    if(selectedRecord === "h2h"){
      return <H2HSection selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeH2HSubTab} />;
    }
    // Tab singoli
    switch (selectedRecord) {
      case "wins": return <Wins/>;
      case "played": return <Played/>;
      case "count": return <Count selectedRounds={selectedRounds} top={displayData?.top} />;
      case "titles": return <Titles topTitles={displayData?.topTitles} />;
      case "entries": return <Entries />;
      case "timespan": return <Timespan selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedTab={activeTimespanSubTab} onTabChange={setActiveTimespanSubTab} />;
      case "percentage": return <Percentage selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} />;
/*       case "least": return <Least selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} />;
      case "firstn": return <FirstN selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} />;
      case "sets": return <Sets selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} />; */
      default: return null;
    }
  };

  return (
    <main className="mx-auto max-w-6xl p-4">
      <header className="mb-6 flex justify-between items-center">

        {/* Tabs */}
        <div className="relative mb-6 flex flex-wrap gap-2 bg-gray-800/40 rounded-2xl p-2 shadow-lg">
          {tabs.map((tab) => (
            <div key={tab.key} className="relative"
              onMouseEnter={() => {
                if (tab.key === "ages") setShowAgesSubTabs(true);
                if (tab.key === "timespan") setShowTimespanSubTabs(true);
                if (tab.key === "roundsonentries") setShowRoundsonentriesSubTabs(true);
                if (tab.key === "same") setShowSameSubTabs(true);
                if (tab.key === "seasons") setShowSeasonsSubTabs(true);
                if (tab.key === "atage") setShowAtAgeSubTabs(true);
                if (tab.key === "ageofnth") setShowAgeofNthSubTabs(true);
                if (tab.key === "neededto") setShowNeededToSubTabs(true);
                if (tab.key === "counterseasons") setShowCounterSeasonsSubTabs(true);
                if (tab.key === "streak") setShowStreakSubTabs(true);
                if (tab.key === "h2h") setShowH2HSubTabs(true);
              }}
              onMouseLeave={() => {
                if (tab.key === "ages") setShowAgesSubTabs(false);
                if (tab.key === "timespan") setShowTimespanSubTabs(false);
                if (tab.key === "roundsonentries") setShowRoundsonentriesSubTabs(false);
                if (tab.key === "same") setShowSameSubTabs(false);
                if (tab.key === "seasons") setShowSeasonsSubTabs(false);
                if (tab.key === "atage") setShowAtAgeSubTabs(false);
                if (tab.key === "ageofnth") setShowAgeofNthSubTabs(false);
                if (tab.key === "neededto") setShowNeededToSubTabs(false);
                if (tab.key === "counterseasons") setShowCounterSeasonsSubTabs(false);
                if (tab.key === "streak") setShowStreakSubTabs(false);
                if (tab.key === "h2h") setShowH2HSubTabs(false);
              }}
            >
              <button
                onClick={() => {
                  if (tab.key === "ages") { setSelectedRecord("ages"); setActiveTab("ages"); setActiveAgesSubTab("oldest"); }
                  else if (tab.key === "timespan") { setSelectedRecord("timespan"); setActiveTab("timespan"); setActiveTimespanSubTab("entries"); }
                  else if (tab.key === "roundsonentries") { setSelectedRecord("roundsonentries"); setActiveTab("roundsonentries"); setActiveRoundsonentriesSubTab("rounds"); }
                  else if (tab.key === "same") { setSelectedRecord("same"); setActiveTab("same"); setActiveSameSubTab("wins"); }
                  else if (tab.key === "seasons") { setSelectedRecord("seasons"); setActiveTab("seasons"); setActiveSeasonsSubTab("wins"); }
                  else if (tab.key === "atage") { setSelectedRecord("atage"); setActiveTab("atage"); setActiveAtAgeSubTab("wins"); }
                  else if (tab.key === "ageofnth") { setSelectedRecord("ageofnth"); setActiveTab("ageofnth"); setActiveAgeofNthSubTab("wins"); }
                  else if (tab.key === "neededto") { setSelectedRecord("neededto"); setActiveTab("neededto"); setActiveNeededToSubTab("titles"); }
                  else if (tab.key === "counterseasons") { setSelectedRecord("counterseasons"); setActiveTab("counterseasons"); setActiveCounterSeasonsSubTab("rounds"); }
                  else if (tab.key === "streak") { setSelectedRecord("streak"); setActiveTab("streak"); setActiveStreakSubTab("count"); }
                  else { setSelectedRecord(tab.key); setActiveTab(tab.key); }
                }}
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

              {/* Sub-tabs UI (shortened where repetitive) */}
              {tab.key === "ages" && showAgesSubTabs && (
                <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-xl p-2 shadow-lg z-20 min-w-max">
                  {agesSubTabs.map((subTab) => (
                    <button
                      key={subTab.key}
                      onClick={() => setActiveAgesSubTab(subTab.key)}
                      className={`block w-full text-left px-4 py-2 rounded ${activeAgesSubTab === subTab.key ? "text-white bg-gray-700" : "text-gray-300 hover:text-white hover:bg-gray-600"}`}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>
              )}

              {tab.key === "timespan" && showTimespanSubTabs && (
                <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-xl p-2 shadow-lg z-20 min-w-max">
                  {timespanSubTabs.map((subTab) => (
                    <button
                      key={subTab.key}
                      onClick={() => setActiveTimespanSubTab(subTab.key)}
                      className={`block w-full text-left px-4 py-2 rounded ${activeTimespanSubTab === subTab.key ? "text-white bg-gray-700" : "text-gray-300 hover:text-white hover:bg-gray-600"}`}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>
              )}

              {tab.key === "roundsonentries" && showRoundsonentriesSubTabs && (
                <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-xl p-2 shadow-lg z-20 min-w-max">
                  {roundsonentriesSubTabs.map((subTab) => (
                    <button
                      key={subTab.key}
                      onClick={() => setActiveRoundsonentriesSubTab(subTab.key)}
                      className={`block w-full text-left px-4 py-2 rounded ${activeRoundsonentriesSubTab === subTab.key ? "text-white bg-gray-700" : "text-gray-300 hover:text-white hover:bg-gray-600"}`}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>
              )}

              {tab.key === "same" && showSameSubTabs && (
                <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-xl p-2 shadow-lg z-20 min-w-max">
                  {sameSubTabs.map((subTab) => (
                    <button
                      key={subTab.key}
                      onClick={() => setActiveSameSubTab(subTab.key)}
                      className={`block w-full text-left px-4 py-2 rounded ${activeSameSubTab === subTab.key ? "text-white bg-gray-700" : "text-gray-300 hover:text-white hover:bg-gray-600"}`}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>
              )}

              {tab.key === "seasons" && showSeasonsSubTabs && (
                <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-xl p-2 shadow-lg z-20 min-w-max">
                  {seasonsSubTabs.map((subTab) => (
                    <button
                      key={subTab.key}
                      onClick={() => setActiveSeasonsSubTab(subTab.key)}
                      className={`block w-full text-left px-4 py-2 rounded ${activeSeasonsSubTab === subTab.key ? "text-white bg-gray-700" : "text-gray-300 hover:text-white hover:bg-gray-600"}`}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>
              )}

              {tab.key === "atage" && showAtAgeSubTabs && (
                <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-xl p-2 shadow-lg z-20 min-w-max">
                  {atAgeSubTabs.map((subTab) => (
                    <button
                      key={subTab.key}
                      onClick={() => setActiveAtAgeSubTab(subTab.key)}
                      className={`block w-full text-left px-4 py-2 rounded ${activeAtAgeSubTab === subTab.key ? "text-white bg-gray-700" : "text-gray-300 hover:text-white hover:bg-gray-600"}`}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>
              )}

              {tab.key === "ageofnth" && showAgeofNthSubTabs && (
                <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-xl p-2 shadow-lg z-20 min-w-max">
                  {ageofNthSubTabs.map((subTab) => (
                    <button
                      key={subTab.key}
                      onClick={() => setActiveAgeofNthSubTab(subTab.key)}
                      className={`block w-full text-left px-4 py-2 rounded ${activeAgeofNthSubTab === subTab.key ? "text-white bg-gray-700" : "text-gray-300 hover:text-white hover:bg-gray-600"}`}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>
              )}

              {tab.key === "neededto" && showNeededToSubTabs && (
                <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-xl p-2 shadow-lg z-20 min-w-max">
                  {neededToSubTabs.map((subTab) => (
                    <button
                      key={subTab.key}
                      onClick={() => setActiveNeededToSubTab(subTab.key)}
                      className={`block w-full text-left px-4 py-2 rounded ${activeNeededToSubTab === subTab.key ? "text-white bg-gray-700" : "text-gray-300 hover:text-white hover:bg-gray-600"}`}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>
              )}

              {tab.key === "counterseasons" && showCounterSeasonsSubTabs && (
                <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-xl p-2 shadow-lg z-20 min-w-max">
                  {counterSeasonsSubTabs.map((subTab) => (
                    <button
                      key={subTab.key}
                      onClick={() => setActiveCounterSeasonsSubTab(subTab.key)}
                      className={`block w-full text-left px-4 py-2 rounded ${activeCounterSeasonsSubTab === subTab.key ? "text-white bg-gray-700" : "text-gray-300 hover:text-white hover:bg-gray-600"}`}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>
              )}

              {tab.key === "streak" && showStreakSubTabs && (
                <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-xl p-2 shadow-lg z-20 min-w-max">
                  {streakSubTabs.map((subTab) => (
                    <button
                      key={subTab.key}
                      onClick={() => setActiveStreakSubTab(subTab.key)}
                      className={`block w-full text-left px-4 py-2 rounded ${activeStreakSubTab === subTab.key ? "text-white bg-gray-700" : "text-gray-300 hover:text-white hover:bg-gray-600"}`}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>
              )}

              {tab.key === "h2h" && showH2HSubTabs && (
                <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-xl p-2 shadow-lg z-20 min-w-max">
                  {h2hSubTabs.map((subTab) => (
                    <button
                      key={subTab.key}
                      onClick={() => setActiveH2HSubTab(subTab.key)}
                      className={`block w-full text-left px-4 py-2 rounded ${activeH2HSubTab === subTab.key ? "text-white bg-gray-700" : "text-gray-300 hover:text-white hover:bg-gray-600"}`}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </header>

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
activeSubTab = { 
  activeTab === "ages" ? activeAgesSubTab : 
  activeTab === "timespan" ? activeTimespanSubTab : 
  activeTab === "roundsonentries" ? activeRoundsonentriesSubTab : 
  activeTab === "same" ? activeSameSubTab : 
  activeTab === "seasons" ? activeSeasonsSubTab : 
  activeTab === "atage" ? activeAtAgeSubTab : 
  activeTab === "ageofnth" ? activeAgeofNthSubTab : 
  activeTab === "neededto" ? activeNeededToSubTab : 
  activeTab === "counterseasons" ? activeCounterSeasonsSubTab : 
  activeTab === "streak" ? activeStreakSubTab : 
  activeTab === "h2h" ? activeH2HSubTab : 
  ""}
        />
      )}

      {/* Tab Content */}
      <div className="mt-4">{renderTabContent()}</div>

      {error && <div className="text-red-600 mt-2">Error: {error}</div>}
    </main>
  );
}

// Page export: sospende il componente che usa useSearchParams
export default function RecordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading records...</div>}>
      <RecordsMain />
    </Suspense>
  );
}