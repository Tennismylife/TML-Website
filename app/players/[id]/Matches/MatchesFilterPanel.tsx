"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import FilterBar from "./FilterBar";
import { Match } from "@/types";
import FilteredMatchesCalculation from "./FilteredMatchesCalculation";

interface Props {
  playerId: string;
  matches: Match[];
  allMatches: Match[];
  updateUrl: (filters: Record<string, string>) => void;
}

const TOURNEY_LEVELS = [
  { code: "G", label: "Grand Slam" },
  { code: "M", label: "Masters 1000" },
  { code: "A", label: "Others" },
  { code: "F", label: "Finals" },
  { code: "D", label: "Davis Cup" },
  { code: "O", label: "Olympics" },
];

export default function MatchesFilterPanel({ playerId, matches, allMatches, updateUrl }: Props) {
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
      setAvailableYears(years);

      const availableLevels = TOURNEY_LEVELS.filter(l =>
        allMatches.some(m => m.tourney_level === l.code)
      );
      setTourneyLevels(availableLevels.map(l => l.code));

      const map = new Map<string, Set<string>>();
      allMatches.forEach(m => {
        if (!m.tourney_id || !m.tourney_name) return;
        const name = m.tourney_name.trim();
        if (!map.has(m.tourney_id)) map.set(m.tourney_id, new Set([name]));
        else map.get(m.tourney_id)!.add(name);
      });

      let tourneys = Array.from(map.entries()).map(([id, namesSet]) => ({
        id,
        name: Array.from(namesSet).join("/")
      }));

      const priorityOrder: Record<string, number> = { "580": 0, "520": 1, "540": 2, "560": 3, "605": 4 };
      tourneys.sort((a,b) => {
        const pa = priorityOrder[a.id] ?? 1000;
        const pb = priorityOrder[b.id] ?? 1000;
        if (pa !== pb) return pa - pb;
        return a.name.localeCompare(b.name);
      });

      setTourneyIds(tourneys.map(t => t.id));
      setTourneyNames(tourneys.map(t => t.name));

      setSelectedYear(years.includes(urlYear ?? "") ? urlYear! : "All");
      setTourneyIdFilter(tourneys.some(t => t.id === urlTourney) ? urlTourney! : "All");
      setTourneyLevelFilter(availableLevels.some(l => l.code === urlLevel) ? urlLevel! : "All");
      setSurfaceFilter(searchParams.get("surface") || "All");
      setRoundFilter(searchParams.get("round") || "All");
      setResultFilter(searchParams.get("result") || "All");
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

  // --- Aggiorna URL quando cambiano filtri ---
  useEffect(() => {
    if (skipFirstUpdateRef.current) {
      skipFirstUpdateRef.current = false;
      return;
    }
    updateUrl({
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
    });
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
  const matchesToCount =
    filteredMatches && filteredMatches.length > 0 ? filteredMatches : matches || [];

  const { wins, losses } = matchesToCount.reduce(
    (acc, m) => {
      if (!m.status) return acc; // ignora match con status !== true
      if (String(m.winner_id) === String(playerId)) acc.wins++;
      else if (String(m.loser_id) === String(playerId)) acc.losses++;
      return acc;
    },
    { wins: 0, losses: 0 }
  );

  setWins(wins);
  setLosses(losses);
}, [filteredMatches, matches, playerId]);


  const winPercentage = (wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(2) : "0.00");

  const tourneyLevelLabels = TOURNEY_LEVELS.reduce((acc, l) => {
    acc[l.code] = l.label;
    return acc;
  }, {} as Record<string,string>);

  return (
    <div className="mb-4">
      <div className="mb-2 font-semibold text-lg">
        W-L: {wins}-{losses} ({winPercentage}%)
      </div>

      {tourneyIds.length > 0 && (
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
        />
      )}
    </div>
  );
}
