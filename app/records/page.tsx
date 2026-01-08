"use client";

import React from 'react';
import { Suspense, useState, useEffect, useRef } from 'react';
import type { Metadata } from 'next';
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";

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

  // Only allow fetching records after the user explicitly activates a tab (or if the URL set the record)
  const [fetchEnabled, setFetchEnabled] = useState(false);
  const [fetchRequestId, setFetchRequestId] = useState<string | null>(null);

  useEffect(() => {
    console.debug('[Records] fetchEnabled changed ->', fetchEnabled);
  }, [fetchEnabled]); // unique id per explicit fetch request (click/filter)
  const lastUrlRecordRef = useRef<string | null>(null);
  // Avoid triggering an initial URL push that causes a double load
  const skipFirstUrlUpdateRef = useRef(true);
  // Skip URL update when manually changing tab/subtab to avoid conflicts
  const skipUrlUpdateRef = useRef(false);

  // Track the last user action reason so we only fetch on click/filter (not hover)
  const lastUserActionRef = useRef<'none' | 'click' | 'filter'>('none');
  const prevSelectedRecordRef = useRef<string | null>(null);



  // --- Sub-tabs state ---
  const [activeSubTabs, setActiveSubTabs] = useState<Record<string, string>>({
    ages: 'oldest',
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

  // Keep track of which main tab is hovered so subtabs can appear on mouse-over
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);


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
      { key: "round", label: "Rounds" },
      { key: "titles", label: "Titles" },
    ],
    streak: [
      { key: "wins", label: "Wins" },
      { key: "round", label: "Round" },
    ],
    h2h: [{ key: "count", label: "Count" }],
  };

  const safeReplace = (url: string) => {
    // Prefer router.replace so Next's internal router and useSearchParams update correctly
    try {
      router.replace(url, { scroll: false });
      return;
    } catch (err) {
      // If router.replace is blocked or fails (e.g., restricted environment), fallback to history.replaceState
      try {
        const newUrl = new URL(url);
        if (newUrl.href !== window.location.href) {
          window.history.replaceState(null, '', newUrl.href);
        }
      } catch (err2) {
        console.debug('[Records] both router.replace and history.replaceState failed:', err, err2);
      }
    }
  };

  const isFilterValid = (filter: 'surfaces' | 'levels' | 'rounds' | 'bestOf', tab: string, sub: string) => {
    // Percentage → tutti i filtri attivi
    if (tab === "percentage") return true;

    // H2H Count → tutti i filtri attivi
    if (tab === "h2h" && sub === "count") return true;

    // Streak → wins
    if (tab === "streak" && sub === "wins") return true;

    // Streak → round
    if (tab === "streak" && sub === "round") {
      return ["levels", "surfaces", "rounds"].includes(filter);
    }

    // Ages → oldest / youngest
    if (tab === "ages" && (sub === "oldest" || sub === "youngest")) {
      return ["levels", "surfaces", "rounds"].includes(filter);
    }

    // Wins, Played, Ages, Percentage → tutti i filtri visibili (eccetto subtab che nascondono round/bestOf)
    const hideRoundAndBestOfSubtabs = ["oldest","youngest","oldestWinners","youngestWinners"];
    if (
      ["wins","played"].includes(tab) || 
      tab === "ages" || 
      (tab === "seasons" && ["wins","played","percentage"].includes(sub)) ||
      ((tab === "atage" || tab === "ageofnth") && ["wins","played"].includes(sub))
    ) {
      if (hideRoundAndBestOfSubtabs.includes(sub) && (filter === "rounds" || filter === "bestOf")) return false;
      return true;
    }

    // Entries / Titles → Level e Surface
    if (
      ["entries","titles"].includes(tab) || 
      ((tab === "same" || tab === "seasons") && ["entries","titles"].includes(sub)) ||
      ((tab === "atage" || tab === "ageofnth") && ["entries","titles"].includes(sub)) ||
      (tab === "neededto" && sub === "titles")
    ) {
      return ["levels","surfaces"].includes(filter);
    }

    // Count → Level, Surface, Round
    if (tab === "count") {
      return ["levels","surfaces","rounds"].includes(filter);
    }

    // Timespan
    if (tab === "timespan") {
      if (["entries","titles"].includes(sub)) return ["levels","surfaces"].includes(filter);
      if (sub === "rounds") return ["levels","surfaces","rounds"].includes(filter);
    }

    // Roundsonentries
    if (tab === "roundsonentries") {
      if (sub === "titles") return ["levels","surfaces"].includes(filter);
      if (sub === "round") return ["levels","surfaces","rounds"].includes(filter);
    }

    // Same
    if (tab === "same") {
      if (["wins","played","entries","titles"].includes(sub)) return ["levels","surfaces"].includes(filter);
      if (sub === "round") return ["levels","surfaces","rounds"].includes(filter);
    }

    // Seasons
    if (tab === "seasons") {
      if (["wins","played","entries","titles"].includes(sub)) return ["levels","surfaces"].includes(filter);
      if (sub === "round") return ["levels","surfaces","rounds","bestOf"].includes(filter);
      if (sub === "percentage") return true;
    }

    // AtAge / AgeofNth
    if (tab === "atage" || tab === "ageofnth") {
      if (["wins","played","entries","titles","slams"].includes(sub)) return ["levels","surfaces"].includes(filter);
      if (sub === "round") return ["levels","surfaces","rounds","bestOf"].includes(filter);
    }

    // NeededTo
    if (tab === "neededto") {
      if (sub === "titles") return ["levels","surfaces"].includes(filter);
    }

    // CounterSeasons
    if (tab === "counterseasons") {
      if (sub === "round") return ["levels","surfaces","rounds"].includes(filter);
      if (sub === "titles") return ["levels","surfaces"].includes(filter);
    }

    return false;
  };

  function kebabToKey(s: string | undefined) {
    if (!s) return s;
    return s.split('-').map((part, idx) => idx === 0 ? part : (part.charAt(0).toUpperCase() + part.slice(1))).join('');
  }

  function keyToKebab(s: string | undefined) {
    if (!s) return s;
    return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }

  // --- Init from pathname or query params ---
  useEffect(() => {
    // Prefer path segments first: /records/<record>[/<subtab>]
    let pathRecord: string | null = null;
    let pathSubtab: string | null = null;
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      const recordsIndex = parts.indexOf('records');
      if (recordsIndex >= 0 && parts.length > recordsIndex + 1) {
        pathRecord = parts[recordsIndex + 1];
        if (parts.length > recordsIndex + 2) pathSubtab = parts[recordsIndex + 2];
      }
    }

    const queryRecord = searchParams.get("record");
    const querySubtab = searchParams.get("subtab") || searchParams.get("tab");
    const surfaceParams = searchParams.getAll("surface");
    const levelParams = searchParams.getAll("level");
    const roundParam = searchParams.get("round");
    const bestOfParam = searchParams.get("bestOf");

    // final values prefer path over query
    const finalRecord = pathRecord ?? queryRecord;
    const finalSub = pathSubtab ? kebabToKey(pathSubtab) : (querySubtab ? kebabToKey(querySubtab) : null);

    if (finalRecord) {
      setSelectedRecord(finalRecord);
      setActiveTab(finalRecord);
      // enable fetch so initial view loads
      const requestId = String(Date.now());
      setFetchRequestId(requestId);
      setFetchEnabled(true);
      lastUserActionRef.current = 'click';
      prevSelectedRecordRef.current = finalRecord;
      if (finalSub) setActiveSubTabs(prev => ({ ...prev, [finalRecord]: finalSub }));

      // If the record came from a legacy query (?record=...), replace with a canonical path
      if (!pathRecord && queryRecord) {
        const subSegment = finalSub ? `/${encodeURIComponent(keyToKebab(finalSub))}` : '';
        const canonicalPath = `/records/${encodeURIComponent(finalRecord)}${subSegment}`;
        skipFirstUrlUpdateRef.current = true;
        safeReplace(canonicalPath);
      }
    }

    if (surfaceParams.length) setSelectedSurfaces(new Set(surfaceParams));
    if (levelParams.length) setSelectedLevels(new Set(levelParams));
    if (roundParam) setSelectedRounds(roundParam);
    if (bestOfParam) setSelectedBestOf(Number(bestOfParam));

    // Clean up legacy 'tab'/'subtab' query params on mount (we canonicalize record/subtab above)
    if (searchParams.get("tab") || searchParams.get("subtab")) {
      const url = new URL(window.location.href);
      url.searchParams.delete('tab');
      url.searchParams.delete('subtab');
      safeReplace(url.toString());
    }
  }, [searchParams]);

  // Clean up 'tab' parameter on mount if present
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('tab')) {
      url.searchParams.delete('tab');
      safeReplace(url.toString());
    }
  }, []);

  // Reset filters when selected record changes (covers programmatic/tab changes)
  useEffect(() => {
    // Track previous 'record' (prefer path segments) and only reset when it actually changes
    let urlRecord = searchParams.get("record");
    let urlSubtab = searchParams.get("subtab");
    if (!urlRecord && typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      const recordsIndex = parts.indexOf('records');
      if (recordsIndex >= 0 && parts.length > recordsIndex + 1) {
        urlRecord = parts[recordsIndex + 1];
        if (!urlSubtab && parts.length > recordsIndex + 2) urlSubtab = kebabToKey(parts[recordsIndex + 2]);
      }
    }

    if (!selectedRecord) {
      lastUrlRecordRef.current = urlRecord;
      return;
    }

    // Reset only when the record param changed after initial load
    if (lastUrlRecordRef.current !== null && lastUrlRecordRef.current !== urlRecord) {
      setSelectedSurfaces(new Set());
      setSelectedLevels(new Set());
      setSelectedRounds("");
      setSelectedBestOf(null);

      if (!(urlRecord === selectedRecord && urlSubtab)) {
        const defaultSub = subTabs[selectedRecord]?.[0]?.key;
        if (defaultSub) setActiveSubTabs(prev => ({ ...prev, [selectedRecord]: defaultSub }));
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('records:reset', { detail: { resetPage: true } }));
      }
    } else {
      // preserve explicit subtab from URL for current record
      if (urlRecord === selectedRecord && urlSubtab) {
        setActiveSubTabs(prev => ({ ...prev, [selectedRecord]: urlSubtab }));
      }
    }

    lastUrlRecordRef.current = urlRecord;
  }, [selectedRecord, searchParams]);

  // --- Update URL query (use replaceState and skip initial update to avoid double load) ---
  useEffect(() => {
    if (!selectedRecord) return;

    // Skip the first automatic update (initialization from URL should not cause a push)
    if (skipFirstUrlUpdateRef.current) {
      skipFirstUrlUpdateRef.current = false;
      return;
    }

    // Skip if manually changing tab/subtab
    if (skipUrlUpdateRef.current) {
      skipUrlUpdateRef.current = false;
      return;
    }

    // Build canonical path: /records/<selectedRecord>[/<subtab>] and add only filter query params
    const query = new URLSearchParams();
    Array.from(selectedSurfaces).forEach(s => query.append("surface", s));
    Array.from(selectedLevels).forEach(l => query.append("level", l));
    if (selectedRounds) query.set("round", selectedRounds);
    if (selectedBestOf) query.set("bestOf", String(selectedBestOf));
    const sub = activeSubTabs[selectedRecord ?? ""];

    const subSegment = sub ? `/${encodeURIComponent(keyToKebab(sub))}` : '';
    const newPath = `/records/${encodeURIComponent(selectedRecord)}${subSegment}` + (query.toString() ? '?' + query.toString() : '');

    if (typeof window !== 'undefined' && window.history && typeof window.history.replaceState === 'function') {
      // Update URL in-place without triggering a navigation
      window.history.replaceState(null, '', newPath);
    } else {
      // Fallback to router.replace if history API is unavailable
      router.replace(newPath, { scroll: false });
    }
  }, [selectedRecord, selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, activeSubTabs, router]);

  // --- Fetch data (debounced + guard) ---
  const fetchTimerRef = useRef<number | null>(null);
  const lastFetchKeyRef = useRef<string | null>(null);
  const FETCH_DEBOUNCE_MS = 200; // ms

  useEffect(() => {
    console.debug('[Records] fetch effect triggered', { selectedRecord, fetchEnabled, lastUserAction: lastUserActionRef.current, prevSelectedRecord: prevSelectedRecordRef.current });
    if (!selectedRecord) return;

    // Don't fetch unless the user explicitly enabled fetches
    if (!fetchEnabled) { console.debug('[Records] fetch blocked: fetchEnabled false'); return; }

    // Clear any pending scheduled fetch
    if (fetchTimerRef.current) {
      clearTimeout(fetchTimerRef.current);
      fetchTimerRef.current = null;
    }

    // Build a deterministic key for the current request params
    const keyObj = {
      r: selectedRecord,
      s: Array.from(selectedSurfaces).sort(),
      l: Array.from(selectedLevels).sort(),
      round: selectedRounds,
      bestOf: selectedBestOf,
      sub: activeSubTabs[selectedRecord ?? ""],
    };
    const key = JSON.stringify(keyObj);

    // If the last successful fetch used the same key, don't fetch again
    if (lastFetchKeyRef.current === key) {
      // nothing to do — already have the latest data for these params
      console.debug('[Records] skip fetch: lastFetchKey equals key');
      return;
    }

    // Schedule a debounced fetch to avoid duplicate rapid requests
    fetchTimerRef.current = window.setTimeout(async () => {
      fetchTimerRef.current = null;

      console.debug('[Records] scheduled fetch running', { selectedRecord, lastUserAction: lastUserActionRef.current, prevSelectedRecord: prevSelectedRecordRef.current });
      // Only fetch when a user action (click/filter) triggered it. Prevent fetches on hover or transient states.
      if (lastUserActionRef.current === 'none') {
        console.debug('[Records] scheduled fetch skipped: no user action');
        return;
      }

      setLoading(true);
      try {
        if (!['percentage','ages','timespan','roundsonentries','same','seasons','atage','ageofnth','neededto','counterseasons','h2h','streak'].includes(selectedRecord)) {
          const query = new URLSearchParams();
          Array.from(selectedSurfaces).forEach(s => query.append('surface', s));
          Array.from(selectedLevels).forEach(l => query.append('level', l));
          if (selectedRounds) query.append('round', selectedRounds);
          if (selectedBestOf) query.set("bestOf", String(selectedBestOf));

          const url = `/api/records/${selectedRecord}${query.toString() ? '?' + query.toString() : ''}`;
          console.debug('[Records] fetching', url);
          const res = await fetch(url);
          if (!res.ok) throw new Error('Failed to fetch records');
          const fetchedData = await res.json();
          setData(fetchedData);
          setDisplayData(fetchedData);

          // mark this key as the last successful fetch
          lastFetchKeyRef.current = key;
          // remember which record we fetched for
          prevSelectedRecordRef.current = selectedRecord;
          // reset last user action (successful path)
          lastUserActionRef.current = 'none';
          console.debug('[Records] fetch completed for', selectedRecord, 'key', key);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
        // Always reset lastUserAction so transient errors do not cause repeated fetch attempts on hover
        lastUserActionRef.current = 'none';
      }
    }, FETCH_DEBOUNCE_MS);

    return () => {
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current);
        fetchTimerRef.current = null;
      }
    };
  }, [selectedRecord, selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, activeSubTabs, fetchEnabled]);

  const renderTabContent = () => {
    if (loading) return <div className="text-gray-500 italic mb-2">Loading...</div>;
    const description = generateRecordDescription(selectedRecord, activeSubTabs, selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf);
    switch(selectedRecord) {
      case "wins": return <Wins topWinners={displayData?.topWinners} fetchEnabled={fetchEnabled} description={description} />;
      case "played": return <Played fetchEnabled={fetchEnabled} description={description} />;
      case "count": return <Count selectedRounds={selectedRounds} top={displayData?.top} description={description} />;
      case "titles": return <Titles topTitles={displayData?.topTitles} description={description} />;
      case "entries": return <Entries fetchEnabled={fetchEnabled} description={description} />;
      case "ages": return <Ages selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} activeSubTab={activeSubTabs.ages} fetchEnabled={fetchEnabled} fetchRequestId={fetchRequestId} description={description} />;
      case "timespan": return <Timespan selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedTab={activeSubTabs.timespan} onTabChange={(tab) => setActiveSubTabs(prev => ({...prev, timespan: tab}))} fetchEnabled={fetchEnabled} fetchRequestId={fetchRequestId} description={description} />;
      case "percentage": return <Percentage selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} fetchEnabled={fetchEnabled} description={description} />;
      case "roundsonentries": return <Roundsonentries selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} activeSubTab={activeSubTabs.roundsonentries} fetchEnabled={fetchEnabled} description={description} />;
      case "same": return <Same selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeSubTabs.same} fetchEnabled={fetchEnabled} setFetchEnabled={setFetchEnabled} fetchRequestId={fetchRequestId} description={description} />;
      case "seasons": return <Seasons selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeSubTabs.seasons} fetchEnabled={fetchEnabled} setFetchEnabled={setFetchEnabled} fetchRequestId={fetchRequestId} description={description} />;
      case "atage": return <AtAge selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeSubTabs.atage} fetchEnabled={fetchEnabled} description={description} />;
      case "ageofnth": return <AgeofNth selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeSubTabs.ageofnth} fetchEnabled={fetchEnabled} fetchRequestId={fetchRequestId} description={description} />;
      case "neededto": return <NeededToSection selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} activeSubTab={activeSubTabs.neededto} fetchEnabled={fetchEnabled} description={description} />;
      case "counterseasons": return <CounterSeasonsSection selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} activeSubTab={activeSubTabs.counterseasons} fetchEnabled={fetchEnabled} description={description} />;
      case "streak": return <StreakSection selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeSubTabs.streak} fetchEnabled={fetchEnabled} description={description} />;
      case "h2h": return <H2HSection selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={activeSubTabs.h2h} fetchEnabled={fetchEnabled} fetchRequestId={fetchRequestId} description={description} />; 
      default: return null;
    }
  };

  return (
    <main className="w-full min-h-screen p-4 bg-gray-900 text-white">
      {/* Intro / Description */}
      <section className="mb-6 text-gray-200">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2 text-white">Records</h1>
        <p className="hidden sm:block text-gray-300 leading-relaxed">
          Welcome to the Records section. This area groups player and tournament records into topics like <strong>Wins</strong>, <strong>Played</strong>, <strong>Titles</strong>, <strong>Entries</strong>, <strong>Ages</strong>, <strong>Timespan</strong>, <strong>Percentage</strong>, <strong>Round-on-Entries</strong>, <strong>Same</strong> (same tournament), <strong>Seasons</strong>, <strong>At Age</strong>, <strong>Age at Nth</strong>, <strong>Needed To</strong>, <strong>Counter Seasons</strong>, <strong>H2H</strong> and <strong>Streak</strong>.
          Each tab renders the component located under <code>app/records/</code> for that topic (for example, <strong>Wins</strong> uses <code>app/records/Wins/Wins.tsx</code>), and available subtabs refine the query (for example Ages → Oldest / Youngest; Timespan → Entries / Titles / Rounds).
          Use the <em>surface</em>, <em>level</em>, <em>round</em> and <em>bestOf</em> filters to narrow the results; the UI enforces which filters are valid for each tab/subtab.
        </p>
        <p className="block sm:hidden text-gray-300">
          Records are grouped by tab (Wins, Played, Titles, etc.) with optional subtabs and filters (surface, level, round, bestOf). Tap a tab to view top lists and open "View All" for the complete set.
        </p>
      </section>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 bg-gray-800/40 rounded-2xl p-2 shadow-lg">
        {tabs.map(tab => (
          <div
            key={tab.key}
            className="relative"
            onMouseEnter={() => { console.debug('[Records] hover enter', tab.key); setHoveredTab(tab.key); }}
            onMouseLeave={() => { console.debug('[Records] hover leave', tab.key); setHoveredTab(null); }}
            onFocus={() => { console.debug('[Records] focus', tab.key); setHoveredTab(tab.key); }}
            onBlur={() => { console.debug('[Records] blur', tab.key); setHoveredTab(null); }}
            tabIndex={-1}
          >
            <button
              onClick={() => {
                // User clicked main tab: select tab and enable fetching only for tabs without subtabs
                lastUserActionRef.current = 'click';
                setSelectedRecord(tab.key);
                setActiveTab(tab.key);
                setSelectedSurfaces(new Set());
                setSelectedLevels(new Set());
                setSelectedRounds("");
                setSelectedBestOf(null);

                // If this tab has no subtabs, enable fetch after state updates so children are mounted
                if (!subTabs[tab.key] || subTabs[tab.key].length === 0) {
                  const requestId = String(Date.now());
                  // wait for the next animation frame so React can mount children before fetching
                  requestAnimationFrame(() => {
                    setFetchEnabled(true);
                    setFetchRequestId(requestId);
                  });
                }

                // Update URL to canonical path and reset filters
                skipUrlUpdateRef.current = true;
                const canonicalPath = `/records/${encodeURIComponent(tab.key)}`;
                safeReplace(canonicalPath + window.location.search.replace(/([?&])(?:surface|level|round|bestOf)=[^&]*/g, '').replace(/[?&]$/, ''));
              }}
              className={`relative px-4 py-2 rounded-xl font-medium transition-colors duration-200 ${(activeTab === tab.key || hoveredTab === tab.key) ? 'text-white' : 'text-gray-300 hover:text-white'}`}
            >
              {(activeTab === tab.key || hoveredTab === tab.key) && (
                <motion.div
                  data-testid="active-tab-bg"
                  layoutId="active-tab"
                  className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-md"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>

            {/* Sub-tabs */}
{subTabs[tab.key] && (activeTab === tab.key || hoveredTab === tab.key) && (
  <div className="mt-2 flex flex-col gap-1">
    {subTabs[tab.key].map(st => (
      <button
        key={st.key}
        onClick={() => {          // User clicked a subtab: activate parent tab immediately, then trigger fetch
          console.debug('[Records] subtab click activate', st.key);
          lastUserActionRef.current = 'click';
          // Activate the subtab locally first so child mounts
          setActiveSubTabs(prev => ({ ...prev, [tab.key]: st.key }));
          setSelectedSurfaces(new Set());
          setSelectedLevels(new Set());
          setSelectedRounds("");
          setSelectedBestOf(null);
          // Small delay to ensure the child has mounted before triggering the fetch and updating the URL
          const requestId = String(Date.now());
          const subSegment = `/${encodeURIComponent(keyToKebab(st.key))}`;
          const canonicalPath = `/records/${encodeURIComponent(tab.key)}${subSegment}`;

          // wait for the next animation frame so React can mount children before fetching
          requestAnimationFrame(() => {
            console.debug('[Records] subtab trigger fetch + url replace', requestId);
            setFetchEnabled(true);
            setFetchRequestId(requestId);
            // Update URL after child mount to avoid race with mounting
            skipUrlUpdateRef.current = true;
            safeReplace(canonicalPath + window.location.search.replace(/([?&])(?:surface|level|round|bestOf)=[^&]*/g, '').replace(/[?&]$/, ''));
          });
        }}
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

      {/* Records organization (under tabs) */}
      {!selectedRecord && (
      <section className="mt-4 mb-6 p-4 bg-gray-800/20 rounded-lg border border-white/10">
        <h3 className="text-lg font-semibold mb-2 text-gray-200">How records are organized</h3>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 text-gray-300">
            <ul className="space-y-2">
              <li><strong>Wins</strong> → Players with the most career wins (see <code>app/records/Wins/Wins.tsx</code>).</li>
              <li><strong>Played</strong> → Players with the most matches played.</li>
              <li><strong>Titles / Entries</strong> → Counts for titles and tournament entries.</li>
              <li><strong>Percentage</strong> → Top win percentages (configurable min matches).</li>
              <li><strong>Ages / Timespan / Seasons / H2H / Streak</strong> → More specialized reports with subtabs (e.g., Ages → Oldest / Youngest; Timespan → Entries / Titles / Rounds).</li>
            </ul>

            <p className="mt-3 text-sm text-gray-400">Subtabs refine the query (for example, choose <em>Oldest</em> or <em>Youngest</em> under Ages); filters <code>surface</code>, <code>level</code>, <code>round</code> and <code>bestOf</code> apply where relevant.</p>
          </div>

          <div className="flex-1 hidden sm:flex items-center justify-center">
            <svg width="420" height="220" viewBox="0 0 420 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Records organization diagram">
              <defs>
                <filter id="f1" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.15"/>
                </filter>
              </defs>

              {/* Left column */}
              <rect x="10" y="20" width="130" height="28" rx="6" fill="#0f172a" stroke="#374151" strokeWidth="1" filter="url(#f1)"/>
              <text x="75" y="38" fill="#d1d5db" fontSize="12" textAnchor="middle">Wins</text>

              <rect x="10" y="58" width="130" height="28" rx="6" fill="#0f172a" stroke="#374151" strokeWidth="1"/>
              <text x="75" y="76" fill="#d1d5db" fontSize="12" textAnchor="middle">Played</text>

              <rect x="10" y="96" width="130" height="28" rx="6" fill="#0f172a" stroke="#374151" strokeWidth="1"/>
              <text x="75" y="114" fill="#d1d5db" fontSize="12" textAnchor="middle">Titles / Entries</text>

              <rect x="10" y="134" width="130" height="28" rx="6" fill="#0f172a" stroke="#374151" strokeWidth="1"/>
              <text x="75" y="152" fill="#d1d5db" fontSize="12" textAnchor="middle">Percentage</text>

              {/* Center hub */}
              <rect x="160" y="60" width="100" height="36" rx="8" fill="#06202a" stroke="#0ea5a4" strokeWidth="1.5"/>
              <text x="210" y="82" fill="#bbf7d0" fontSize="12" textAnchor="middle">Record Types</text>

              {/* Right column */}
              <rect x="290" y="20" width="120" height="28" rx="6" fill="#0f172a" stroke="#374151" strokeWidth="1"/>
              <text x="350" y="38" fill="#d1d5db" fontSize="12" textAnchor="middle">Ages</text>

              <rect x="290" y="58" width="120" height="28" rx="6" fill="#0f172a" stroke="#374151" strokeWidth="1"/>
              <text x="350" y="76" fill="#d1d5db" fontSize="12" textAnchor="middle">Timespan</text>

              <rect x="290" y="96" width="120" height="28" rx="6" fill="#0f172a" stroke="#374151" strokeWidth="1"/>
              <text x="350" y="114" fill="#d1d5db" fontSize="12" textAnchor="middle">Seasons</text>

              <rect x="290" y="134" width="120" height="28" rx="6" fill="#0f172a" stroke="#374151" strokeWidth="1"/>
              <text x="350" y="152" fill="#d1d5db" fontSize="12" textAnchor="middle">H2H / Streak</text>

              {/* Arrows left -> center */}
              <defs>
                <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 L2,3 z" fill="#9CA3AF"/>
                </marker>
              </defs>

              <line x1="140" y1="34" x2="160" y2="74" stroke="#9CA3AF" strokeWidth="1.5" markerEnd="url(#arrow)"/>
              <line x1="140" y1="72" x2="160" y2="78" stroke="#9CA3AF" strokeWidth="1.5" markerEnd="url(#arrow)"/>
              <line x1="140" y1="110" x2="160" y2="82" stroke="#9CA3AF" strokeWidth="1.5" markerEnd="url(#arrow)"/>
              <line x1="140" y1="148" x2="160" y2="86" stroke="#9CA3AF" strokeWidth="1.5" markerEnd="url(#arrow)"/>

              {/* Arrows center -> right */}
              <line x1="260" y1="74" x2="290" y2="34" stroke="#9CA3AF" strokeWidth="1.5" markerEnd="url(#arrow)"/>
              <line x1="260" y1="78" x2="290" y2="72" stroke="#9CA3AF" strokeWidth="1.5" markerEnd="url(#arrow)"/>
              <line x1="260" y1="82" x2="290" y2="110" stroke="#9CA3AF" strokeWidth="1.5" markerEnd="url(#arrow)"/>
              <line x1="260" y1="86" x2="290" y2="150" stroke="#9CA3AF" strokeWidth="1.5" markerEnd="url(#arrow)"/>
            </svg>
          </div>
        </div>
      </section>
      )}
      {selectedRecord && (
        <FiltersComponent
          selectedSurfaces={selectedSurfaces}
          setSelectedSurfaces={(s) => { lastUserActionRef.current = 'filter'; setSelectedSurfaces(s); if (['same','seasons','atage','ageofnth','counterseasons','timespan'].includes(selectedRecord ?? '')) { const requestId = String(Date.now()); setFetchEnabled(true); setFetchRequestId(requestId); } }}
          selectedLevels={selectedLevels}
          setSelectedLevels={(l) => { lastUserActionRef.current = 'filter'; setSelectedLevels(l); if (['same','seasons','atage','ageofnth','counterseasons','timespan'].includes(selectedRecord ?? '')) { const requestId = String(Date.now()); setFetchEnabled(true); setFetchRequestId(requestId); } }}
          selectedRounds={selectedRounds}
          setSelectedRounds={(r) => { lastUserActionRef.current = 'filter'; setSelectedRounds(r); if (['same','seasons','atage','ageofnth','counterseasons','timespan'].includes(selectedRecord ?? '')) { const requestId = String(Date.now()); setFetchEnabled(true); setFetchRequestId(requestId); } }}
          selectedBestOf={selectedBestOf}
          setSelectedBestOf={(b) => { lastUserActionRef.current = 'filter'; setSelectedBestOf(b); if (['same','seasons','atage','ageofnth','counterseasons','timespan'].includes(selectedRecord ?? '')) { const requestId = String(Date.now()); setFetchEnabled(true); setFetchRequestId(requestId); } }}
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
