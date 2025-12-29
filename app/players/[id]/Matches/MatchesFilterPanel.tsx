"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import FilterBar from "./FilterBar";
import { Match } from "@/types";
import FilteredMatchesCalculation from "./FilteredMatchesCalculation";

interface Props {
  playerId: string;
  matches: Match[];
  allMatches: Match[];
  /** The subset of matches currently displayed (e.g. first 10) */
  displayedMatches?: Match[];
  updateUrl: (filters: Record<string, string>) => void;
  onExplicitChange?: (key: string, value: string) => void;
}

const TOURNEY_LEVELS = [
  { code: "G", label: "Grand Slam" },
  { code: "M", label: "Masters 1000" },
  { code: "A", label: "Others" },
  { code: "F", label: "Finals" },
  { code: "D", label: "Davis Cup" },
  { code: "O", label: "Olympics" },
];

export default function MatchesFilterPanel({ playerId, matches, allMatches, displayedMatches, updateUrl, onExplicitChange }: Props) {
  const searchParams = useSearchParams();
  const urlYear = searchParams.get("year");
  const urlTourney = searchParams.get("tourney");
  const urlLevel = searchParams.get("level");

  // --- Filtri selezionati ---
  const [selectedYear, setSelectedYear] = useState<string>("All");
  const [tourneyLevelFilter, setTourneyLevelFilter] = useState<string>("All");
  const [tourneyIdFilter, setTourneyIdFilter] = useState<string>("All");
  const [surfaceFilter, setSurfaceFilter] = useState<string>("All");
  const [roundFilter, setRoundFilter] = useState<string>("All");
  const [resultFilter, setResultFilter] = useState<string>("All");
  const [vsRankFilter, setVsRankFilter] = useState<string>("All");
  const [vsAgeFilter, setVsAgeFilter] = useState<string>("All");
  const [vsHandFilter, setVsHandFilter] = useState<string>("All");
  const [vsBackhandFilter, setVsBackhandFilter] = useState<string>("All");
  const [vsEntryFilter, setVsEntryFilter] = useState<string>("All");
  const [asRankFilter, setAsRankFilter] = useState<string>("All");
  const [asEntryFilter, setAsEntryFilter] = useState<string>("All");
  const [matchSetFilter, setMatchSetFilter] = useState<string>("All");
  const [firstSetFilter, setFirstSetFilter] = useState<string>("All");
  const [scoreFilter, setScoreFilter] = useState<string>("All");
  const [backhandMap, setBackhandMap] = useState<Map<string, string>>(new Map());

  // --- Filtri disponibili ---
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [tourneyLevels, setTourneyLevels] = useState<string[]>([]);
  const [tourneyIds, setTourneyIds] = useState<string[]>([]);
  const [tourneyNames, setTourneyNames] = useState<string[]>([]);
  const surfaces = ["Hard", "Clay", "Grass", "Carpet"];
  const rounds = ["R128","R64","R32","R16","QF","SF","F","RR","3rd/4th","BR"];

  const initializedRef = useRef(false);

  // --- Inizializzazione filtri disponibili dai match ---
  useEffect(() => {
    if (!initializedRef.current && allMatches.length > 0) {
      const years = Array.from(new Set(allMatches.map(m => m.year)))
                         .sort((a,b) => b-a)
                         .map(String);
      // if URL provided a year that's not in the available list, add it so the UI preserves the selection
      if (urlYear && !years.includes(urlYear)) setAvailableYears(prev => [urlYear, ...years]);
      else setAvailableYears(years);
      
      const availableLevels = TOURNEY_LEVELS.filter(l =>
        allMatches.some(m => m.tourney_level === l.code)
      );
      // preserve external level param if present
      if (urlLevel && !availableLevels.some(l => l.code === urlLevel)) setTourneyLevels(prev => [urlLevel, ...availableLevels.map(l => l.code)]);
      else setTourneyLevels(availableLevels.map(l => l.code));

      const map = new Map<string, Set<string>>();
      allMatches.forEach(m => {
        // Exclude tournaments with tourney_level === 'D' (e.g., Davis Cup)
        if (m.tourney_level === 'D') return;
        if (!m.tourney_id || !m.tourney_name) return;
        const name = m.tourney_name.trim();
        if (!map.has(m.tourney_id)) map.set(m.tourney_id, new Set([name]));
        else map.get(m.tourney_id)!.add(name);
      });

      let tourneys = Array.from(map.entries()).map(([id, namesSet]) => ({
        id,
        name: Array.from(namesSet).join("/")
      }));

      // if URL provided a tourney that's not in the list, add it at the front so selection is preserved
      if (urlTourney && !tourneys.some(t => t.id === urlTourney)) {
        tourneys = [{ id: urlTourney, name: urlTourney }, ...tourneys];
      }

      const priorityOrder: Record<string, number> = { "580": 0, "520": 1, "540": 2, "560": 3, "605": 4 };
      tourneys.sort((a,b) => {
        const pa = priorityOrder[a.id] ?? 1000;
        const pb = priorityOrder[b.id] ?? 1000;
        if (pa !== pb) return pa - pb;
        return a.name.localeCompare(b.name);
      });

      setTourneyIds(tourneys.map(t => t.id));
      setTourneyNames(tourneys.map(t => t.name));

      // prefer the year from the URL when present (and preserve unknown year)
      setSelectedYear(urlYear ?? "All");
      setTourneyIdFilter(urlTourney ?? "All");
      setTourneyLevelFilter(urlLevel ?? "All");
      setVsRankFilter(searchParams.get("vsRank") || "All");
      setVsAgeFilter(searchParams.get("vsAge") || "All");
      setVsHandFilter(searchParams.get("vsHand") || "All");
      setVsBackhandFilter(searchParams.get("vsBackhand") || "All");
      setVsEntryFilter(searchParams.get("vsEntry") || "All");
      setAsRankFilter(searchParams.get("asRank") || "All");
      setAsEntryFilter(searchParams.get("asEntry") || "All");
      setMatchSetFilter(searchParams.get("set") || "All");
      setFirstSetFilter(searchParams.get("firstSet") || "All");
      setScoreFilter(searchParams.get("score") || "All");

      initializedRef.current = true;
    }
  }, [allMatches, urlYear, urlTourney, urlLevel, searchParams]);

  // --- Ref per evitare updateUrl al primo render ---
  const skipFirstUpdateRef = useRef(true);

  // small logs for debugging filter changes
  useEffect(() => { console.debug('[MatchesFilterPanel] selectedYear changed ->', selectedYear); }, [selectedYear]);
  useEffect(() => { console.debug('[MatchesFilterPanel] tourneyIdFilter changed ->', tourneyIdFilter); }, [tourneyIdFilter]);
  useEffect(() => { console.debug('[MatchesFilterPanel] tourneyLevelFilter changed ->', tourneyLevelFilter); }, [tourneyLevelFilter]);

  // --- Aggiorna URL quando cambiano filtri ---
  useEffect(() => {
    if (!initializedRef.current) {
      console.debug('[MatchesFilterPanel] not initialized yet, skipping update');
      return;
    }

    if (skipFirstUpdateRef.current) {
      skipFirstUpdateRef.current = false;
      console.debug('[MatchesFilterPanel] skipping first automatic update');
      return;
    }

    const payload = {
      year: selectedYear,
      level: tourneyLevelFilter,
      tourney: tourneyIdFilter,
      surface: surfaceFilter,
      round: roundFilter,
      result: resultFilter,
      vsRank: vsRankFilter,
      vsAge: vsAgeFilter,
      vsHand: vsHandFilter,
      vsBackhand: vsBackhandFilter,
      vsEntry: vsEntryFilter,
      asRank: asRankFilter,
      asEntry: asEntryFilter,
      set: matchSetFilter,
      firstSet: firstSetFilter,
      score: scoreFilter,
    };
    console.debug('[MatchesFilterPanel] automatic updateUrl payload:', payload);
    updateUrl(payload as Record<string, string>);
  }, [
    selectedYear, tourneyLevelFilter, tourneyIdFilter, surfaceFilter, roundFilter,
    resultFilter, vsRankFilter, vsAgeFilter, vsHandFilter, vsBackhandFilter,
    vsEntryFilter, asRankFilter, asEntryFilter, matchSetFilter, firstSetFilter, scoreFilter
  ]);

  // --- Filtraggio dei match ---
  const filteredMatches = useMemo(() => {
    if (!matches || matches.length === 0) return [];
    return FilteredMatchesCalculation(
      matches,
      playerId,
      selectedYear === "All" ? "All" : Number(selectedYear),
      tourneyIdFilter,
      surfaceFilter,
      roundFilter,
      resultFilter,
      vsRankFilter,
      vsAgeFilter,
      vsHandFilter,
      vsBackhandFilter,
      vsEntryFilter,
      asRankFilter,
      asEntryFilter,
      "", // tourneyNameFilter (non usato)
      matchSetFilter,
      firstSetFilter,
      scoreFilter,
      backhandMap
    );
  }, [
    matches, playerId, selectedYear, tourneyIdFilter, surfaceFilter, roundFilter,
    resultFilter, vsRankFilter, vsAgeFilter, vsHandFilter, vsBackhandFilter,
    vsEntryFilter, asRankFilter, asEntryFilter, matchSetFilter, firstSetFilter,
    scoreFilter, backhandMap
  ]);

  // --- Stato W-L ---
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);

// --- Calcolo W-L solo per match con status true ---
useEffect(() => {
  // Base matches: if filters applied, use filteredMatches, otherwise use full matches
  const baseMatches = filteredMatches && filteredMatches.length > 0 ? filteredMatches : matches || [];

  // If caller provided a displayed subset (e.g. first 10 visible matches) and it's smaller
  // than the base set, count on the displayed subset so W-L matches what the UI shows.
  const matchesToCount = (displayedMatches && displayedMatches.length > 0 && displayedMatches.length < baseMatches.length)
    ? displayedMatches
    : baseMatches;

  const { wins, losses } = matchesToCount.reduce(
    (acc, m) => {
      if (!m.status) return acc; // ignore matches with status !== true for W-L counts
      if (String(m.winner_id) === String(playerId)) acc.wins++;
      else if (String(m.loser_id) === String(playerId)) acc.losses++;
      return acc;
    },
    { wins: 0, losses: 0 }
  );

  setWins(wins);
  setLosses(losses);
}, [filteredMatches, matches, playerId, displayedMatches]);




  const winPercentage = (wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(2) : "0.00");

  const tourneyLevelLabels = TOURNEY_LEVELS.reduce((acc, l) => {
    acc[l.code] = l.label;
    return acc;
  }, {} as Record<string,string>);

  return (
    <div className="mb-0 text-sm pr-0">
      {tourneyIds.length > 0 && (
        <div className="mt-0 pr-0">
          <FilterBar
            years={availableYears}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            tourneyLevels={tourneyLevels}
            tourneyLevelLabels={tourneyLevelLabels}
            selectedLevel={tourneyLevelFilter}
            setSelectedLevel={setTourneyLevelFilter}
            tourneyIds={tourneyIds}
            tourneyNames={tourneyNames}
            selectedTourneyId={tourneyIdFilter}
            setSelectedTourneyId={setTourneyIdFilter}
            surfaces={surfaces}
            selectedSurface={surfaceFilter}
            setSelectedSurface={setSurfaceFilter}
            rounds={rounds}
            selectedRound={roundFilter}
            setSelectedRound={setRoundFilter}
            resultFilter={resultFilter}
            setResultFilter={setResultFilter}
            vsRankFilter={vsRankFilter}
            setVsRankFilter={setVsRankFilter}
            vsAgeFilter={vsAgeFilter}
            setVsAgeFilter={setVsAgeFilter}
            vsHandFilter={vsHandFilter}
            setVsHandFilter={setVsHandFilter}
            vsBackhandFilter={vsBackhandFilter}
            setVsBackhandFilter={setVsBackhandFilter}
            vsEntryFilter={vsEntryFilter}
            setVsEntryFilter={setVsEntryFilter}
            asRankFilter={asRankFilter}
            setAsRankFilter={setAsRankFilter}
            asEntryFilter={asEntryFilter}
            setAsEntryFilter={setAsEntryFilter}
            setFilter={matchSetFilter}
            setSetFilter={setMatchSetFilter}
            firstSetFilter={firstSetFilter}
            setFirstSetFilter={setFirstSetFilter}
            scoreFilter={scoreFilter}
            setScoreFilter={setScoreFilter}
            onExplicitChange={onExplicitChange}
          />
        </div>
      )}
    </div>
  );
}