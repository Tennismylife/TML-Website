"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import FiltersComponent from './FiltersComponent';
import { generateRecordDescription } from '../../lib/generateRecordDescription';
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

interface Props {
  initialRecord?: string | null;
  initialSubtab?: string | null;
}

const tabs = [
  { key: 'wins', label: 'Wins' },
  { key: 'played', label: 'Played' },
  { key: 'count', label: 'Count' },
  { key: 'titles', label: 'Titles' },
  { key: 'entries', label: 'Entries' },
  { key: 'ages', label: 'Ages' },
  { key: 'timespan', label: 'Timespan' },
  { key: 'percentage', label: 'Percentage' },
  { key: 'roundsonentries', label: 'Rounds on Entries' },
  { key: 'same', label: 'Same' },
  { key: 'seasons', label: 'Seasons' },
  { key: 'atage', label: 'At Age' },
  { key: 'ageofnth', label: 'Age at Nth' },
  { key: 'neededto', label: 'Needed To' },
  { key: 'counterseasons', label: 'Counter Seasons' },
  { key: 'h2h', label: 'H2H' },
  { key: 'streak', label: 'Streak' },
];

const subTabs: Record<string, { key: string; label: string }[]> = {
  ages: [
    { key: "oldest", label: "Oldest Main Draw" },
    { key: "youngest", label: "Youngest Main Draw" },
    { key: "oldest-winners", label: "Oldest Winners" },
    { key: "youngest-winners", label: "Youngest Winners" },
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
    { key: "round", label: "Rounds" },
    { key: "titles", label: "Titles" },
  ],
  streak: [
    { key: "wins", label: "Wins" },
    { key: "round", label: "Round" },
  ],
  h2h: [{ key: "count", label: "Count" }],
};

function buildPath(record: string, sub?: string) {
  let path = `/records/${encodeURIComponent(record)}`;
  if (sub) path += `/${encodeURIComponent(sub)}`;
  return path;
}

export default function RecordsClient({ initialRecord = null, initialSubtab = null }: Props) {
  const router = useRouter();

  const [selectedRecord, setSelectedRecord] = useState<string | null>(initialRecord ?? null);
  const [activeTab, setActiveTab] = useState<string | null>(initialRecord ?? null);

  const [selectedSurfaces, setSelectedSurfaces] = useState<Set<string>>(new Set());
  const [selectedLevels, setSelectedLevels] = useState<Set<string>>(new Set());
  const [selectedRounds, setSelectedRounds] = useState<string>('');
  const [selectedBestOf, setSelectedBestOf] = useState<number | null>(null);

  const [fetchEnabled, setFetchEnabled] = useState(false);
  const [fetchRequestId, setFetchRequestId] = useState<string | null>(null);

  const lastUserActionRef = useRef<'none' | 'click' | 'filter'>('none');
  const activeSubTabsRef = useRef<Record<string,string>>({
    ages: initialSubtab ?? 'oldest',
    timespan: 'entries',
    roundsonentries: 'titles',
    same: 'wins',
    seasons: 'wins',
    atage: 'wins',
    ageofnth: 'wins',
    neededto: 'titles',
    counterseasons: 'round',
    streak: 'wins',
    h2h: 'count',
  });

  useEffect(() => {
    if (!selectedRecord) return;
    const sub = activeSubTabsRef.current[selectedRecord ?? ""];
    const path = buildPath(selectedRecord, sub);
    try {
      const desc = generateRecordDescription(selectedRecord, activeSubTabsRef.current, selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf);
      if (desc && typeof document !== 'undefined') {
        const newTitle = `${desc} — TML`;
        const currentTitle = typeof document !== 'undefined' ? document.title || '' : '';
        const shouldForceTitle = lastUserActionRef.current === 'click' || lastUserActionRef.current === 'filter';

        // If the user initiated the change, allow the client to overwrite the title (to reflect selected filters).
        if (shouldForceTitle) {
          document.title = newTitle;
          if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.debug('[RecordsClient] forced title (user action)', document.title);
        } else {
          // Otherwise only set the title if it isn't already an SEO title or differs from the desired title
          if (!currentTitle.includes('— TML') || currentTitle !== newTitle) {
            document.title = newTitle;
            if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.debug('[RecordsClient] set title', document.title);
          } else {
            if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.debug('[RecordsClient] not overwriting server SEO title', currentTitle);
          }
        }
      } else {
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.debug('[RecordsClient] skipping title update (no desc)');
      }
    } catch (err) {}
    const shouldPush = lastUserActionRef.current === 'click' || lastUserActionRef.current === 'filter';
    if (shouldPush) {
      try { router.push(path); } catch { try { window.history.pushState(null,'',path); } catch {} }
    } else {
      try { router.replace(path); } catch { try { window.history.replaceState(null,'',path); } catch {} }
    }
    lastUserActionRef.current = 'none';
  }, [selectedRecord, selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  const handleTabClick = (tabKey: string) => {
    lastUserActionRef.current = 'click';
    setSelectedRecord(tabKey);
    setActiveTab(tabKey);
    setSelectedSurfaces(new Set());
    setSelectedLevels(new Set());
    setSelectedRounds('');
    setSelectedBestOf(null);
    // enable fetch for simple tabs
    if (!subTabs[tabKey] || subTabs[tabKey].length === 0) {
      const id = String(Date.now());
      requestAnimationFrame(() => { setFetchEnabled(true); setFetchRequestId(id); });
    }
  };

  const handleSubtabClick = (tabKey: string, subKey: string) => {
    lastUserActionRef.current = 'click';
    activeSubTabsRef.current = { ...activeSubTabsRef.current, [tabKey]: subKey };
    setSelectedSurfaces(new Set());
    setSelectedLevels(new Set());
    setSelectedRounds('');
    setSelectedBestOf(null);
    const id = String(Date.now());
    requestAnimationFrame(() => { setFetchEnabled(true); setFetchRequestId(id); });
  };

  const renderTabContent = () => {
    switch(selectedRecord) {
      case "wins": return <Wins fetchEnabled={fetchEnabled} description={""} />;
      case "played": return <Played fetchEnabled={fetchEnabled} description={""} />;
      case "count": return <Count selectedRounds={selectedRounds} description={""} />;
      case "titles": return <Titles topTitles={undefined} description={""} />;
      case "entries": return <Entries fetchEnabled={fetchEnabled} description={""} />;
      case "ages": return <Ages selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} activeSubTab={activeSubTabsRef.current.ages} fetchEnabled={fetchEnabled} fetchRequestId={fetchRequestId} description={""} />;
      case "timespan": return <Timespan selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedTab={activeSubTabsRef.current.timespan || 'entries'} fetchEnabled={fetchEnabled} fetchRequestId={fetchRequestId} description={""} />;
      case "percentage": return <Percentage selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} fetchEnabled={fetchEnabled} description={""} />;
      case "roundsonentries": return <Roundsonentries selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} activeSubTab={activeSubTabsRef.current.roundsonentries} fetchEnabled={fetchEnabled} description={""} />;
      case "same": return <Same selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeSubTabsRef.current.same} fetchEnabled={fetchEnabled} setFetchEnabled={setFetchEnabled} fetchRequestId={fetchRequestId} description={""} />;
      case "seasons": return <Seasons selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeSubTabsRef.current.seasons} fetchEnabled={fetchEnabled} setFetchEnabled={setFetchEnabled} fetchRequestId={fetchRequestId} description={""} />;
      case "atage": return <AtAge selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeSubTabsRef.current.atage} fetchEnabled={fetchEnabled} description={""} />;
      case "ageofnth": return <AgeofNth selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeSubTabsRef.current.ageofnth} fetchEnabled={fetchEnabled} fetchRequestId={fetchRequestId} description={""} />;
      case "neededto": return <NeededToSection selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} activeSubTab={activeSubTabsRef.current.neededto} fetchEnabled={fetchEnabled} description={""} />;
      case "counterseasons": return <CounterSeasonsSection selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeSubTabsRef.current.counterseasons || 'round'} fetchEnabled={fetchEnabled} description={""} />;
      case "streak": return <StreakSection selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeSubTabsRef.current.streak} fetchEnabled={fetchEnabled} description={""} />;
      case "h2h": return <H2HSection selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeSubTabsRef.current.h2h} fetchEnabled={fetchEnabled} fetchRequestId={fetchRequestId} description={""} />;
      default: return null;
    }
  };

  return (
    <main className="w-full min-h-screen p-4 bg-gray-900 text-white">
      <section className="mb-6 text-gray-200">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2 text-white">Records</h1>
      </section>

      <div className="mb-6 flex flex-wrap gap-2 bg-gray-800/40 rounded-2xl p-2 shadow-lg">
        {tabs.map(tab => (
          <div key={tab.key} className="relative">
            <button onClick={() => handleTabClick(tab.key)} className={`px-4 py-2 rounded-xl ${activeTab === tab.key ? 'text-white' : 'text-gray-300 hover:text-white'}`}>
              {tab.label}
            </button>

            {subTabs[tab.key] && activeTab === tab.key && (
              <div className="mt-2 flex flex-col gap-1">
                {subTabs[tab.key].map(st => (
                  <button key={st.key} onClick={() => handleSubtabClick(tab.key, st.key)} className={`px-3 py-1 rounded ${activeSubTabsRef.current[tab.key] === st.key ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white'}`}>
                    {st.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedRecord && (
        <FiltersComponent
          selectedSurfaces={selectedSurfaces}
          setSelectedSurfaces={(s) => { lastUserActionRef.current = 'filter'; setSelectedSurfaces(s); const id = String(Date.now()); setFetchRequestId(id); setFetchEnabled(true); }}
          selectedLevels={selectedLevels}
          setSelectedLevels={(l) => { lastUserActionRef.current = 'filter'; setSelectedLevels(l); const id = String(Date.now()); setFetchRequestId(id); setFetchEnabled(true); }}
          selectedRounds={selectedRounds}
          setSelectedRounds={(r) => { lastUserActionRef.current = 'filter'; setSelectedRounds(r); const id = String(Date.now()); setFetchRequestId(id); setFetchEnabled(true); }}
          selectedBestOf={selectedBestOf}
          setSelectedBestOf={(b) => { lastUserActionRef.current = 'filter'; setSelectedBestOf(b); const id = String(Date.now()); setFetchRequestId(id); setFetchEnabled(true); }}
          activeTab={activeTab ?? ""}
          activeSubTab={activeSubTabsRef.current[activeTab ?? ""] ?? ""}
        />
      )}

      <div className="w-full mt-4">{renderTabContent()}</div>
    </main>
  );
}
