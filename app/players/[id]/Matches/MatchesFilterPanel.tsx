"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { usePathname } from "next/navigation";
import FilterBar from "./FilterBar";
import { Match } from "@/types";
import FilteredMatchesCalculation from "./FilteredMatchesCalculation";

// Normalize a tourney name for stable deduplication (remove diacritics/zero-width/punctuation)
function normalizeTourneyName(name: string) {
  const base = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  if (base.includes('australian') && (base.includes('open') || base.includes('championship'))) return 'australian open';
  if (base.includes('roland') || base.includes('french open')) return 'roland garros';
  if (base.includes('wimbledon')) return 'wimbledon';
  if ((base.includes('us') || base.includes('u s') || base.includes('united states')) && base.includes('open')) return 'us open';
  return base;
}

// Build a unique list of tourney names. If multiple names map to the same normalized label,
// keep a single entry (unique name). The first id encountered is kept.
function buildUniqueTourneyList(items: Array<{ id: string; name?: string | null }>) {
  const order: string[] = [];
  const idByKey = new Map<string, string>();
  const namesByKey = new Map<string, string[]>();

  items.forEach((item) => {
    const id = String(item.id ?? '').trim();
    const rawName = (item.name ?? id).toString().trim();
    if (!rawName) return;
    const key = normalizeTourneyName(rawName);
    if (!key) return;
    if (!namesByKey.has(key)) {
      namesByKey.set(key, []);
      order.push(key);
      if (id) idByKey.set(key, id);
    }
    const list = namesByKey.get(key)!;
    if (!list.includes(rawName)) list.push(rawName);
  });

  const ids = order.map((key) => idByKey.get(key) ?? key);
  const names = order.map((key) => {
    const list = namesByKey.get(key) ?? [];
    return list.length > 1 ? list.join(' / ') : (list[0] ?? key);
  });

  return { ids, names };
}

function sortTourneyListByPriority(ids: string[], names: string[]) {
  const priority: Record<string, number> = {
    'australian open': 0,
    'roland garros': 1,
    'wimbledon': 2,
    'us open': 3,
  };
  const items = names.map((name, i) => ({ id: ids[i], name }));
  items.sort((a, b) => {
    const pa = priority[normalizeTourneyName(a.name)] ?? 1000;
    const pb = priority[normalizeTourneyName(b.name)] ?? 1000;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });
  return {
    ids: items.map((i) => i.id),
    names: items.map((i) => i.name),
  };
}

interface Props {
  playerId: string;
  matches: Match[];
  allMatches: Match[];
  allMatchesFetched?: boolean;
  /** The subset of matches currently displayed (e.g. first 10) */
  displayedMatches?: Match[];
  // Callback to notify parent about current selected filters (for dynamic headings etc.)
  onFiltersChange?: (filters: Record<string, string>) => void;
  // Optional server-provided facets (SSR) to avoid a client-side fetch
  serverFacets?: any;
} 

// ... later in the file, after filteredMatches and wins/losses state, add effect to notify parent when filters change

const TOURNEY_LEVELS = [
  { code: "G", label: "Grand Slam" },
  { code: "M", label: "Masters 1000" },
  { code: "A", label: "Others" },
  { code: "F", label: "Finals" },
  { code: "D", label: "Davis Cup" },
  { code: "O", label: "Olympics" },
];

/**
 * Reads filter params from the URL hash fragment (#year=2026&surface=Hard).
 * Hash fragments are never sent to the server — Google's crawler never sees them.
 */
function useHashParams(): URLSearchParams {
  const [params, setParams] = useState<URLSearchParams>(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.hash.slice(1));
  });
  useEffect(() => {
    const onHashChange = () => {
      setParams(new URLSearchParams(window.location.hash.slice(1)));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return params;
}

export default function MatchesFilterPanel({ playerId, matches, allMatches, displayedMatches, onFiltersChange, allMatchesFetched, serverFacets }: Props) {
  const hashParams = useHashParams();
  const urlYear = hashParams.get("year");
  const urlTourney = hashParams.get("tourney");
  const urlLevel = hashParams.get("level");
  const urlSurface = hashParams.get("surface");
  const pathname = usePathname();
  const pathSurface = (() => {
    const seg = pathname?.split('/')?.[3]?.toLowerCase();
    if (seg === 'clay') return 'Clay';
    if (seg === 'hard') return 'Hard';
    if (seg === 'grass') return 'Grass';
    return null;
  })();

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
  const [availableSurfaceOptions, setAvailableSurfaceOptions] = useState<string[]>(["Hard", "Clay", "Grass", "Carpet"]);
  const [facetsLoaded, setFacetsLoaded] = useState(false);
  const [facets, setFacets] = useState<any>(null);

  // Initialize facets: prefer server-provided facets (SSR) and skip client fetch when available; otherwise fetch lightweight facets client-side
  const [fetchingFacets, setFetchingFacets] = useState(false);

  useEffect(() => {
    if (serverFacets) {
      setFacets(serverFacets);
      if (Array.isArray(serverFacets.years)) setAvailableYears(serverFacets.years.map((y: any) => String(y.value)));
      if (Array.isArray(serverFacets.surfaces)) setAvailableSurfaceOptions(serverFacets.surfaces.map((s: any) => String(s.value)));
      if (Array.isArray(serverFacets.levels)) setTourneyLevels(serverFacets.levels.map((l: any) => String(l.value)));
      if (Array.isArray(serverFacets.tourneys)) {
        const items = serverFacets.tourneys.map((t: any) => ({ id: String(t.id), name: t.name ?? String(t.id) }));
        const { ids, names } = buildUniqueTourneyList(items);
        const sorted = sortTourneyListByPriority(ids, names);
        setTourneyIds(sorted.ids);
        setTourneyNames(sorted.names);
      }
      setFacetsLoaded(true);
      return;
    }

    let aborted = false;
    setFetchingFacets(true);
    (async () => {
      try {
        const res = await fetch(`/api/players/match-facets?id=${encodeURIComponent(playerId)}`, { cache: 'force-cache' });
        if (!res.ok) throw new Error('facets fetch failed');
        const j = await res.json();
        if (aborted) return;
        setFacets(j);
        if (Array.isArray(j.years) && j.years.length) setAvailableYears(j.years.map((y: any) => String(y.value)));
        if (Array.isArray(j.surfaces) && j.surfaces.length) setAvailableSurfaceOptions(j.surfaces.map((s: any) => String(s.value)));
        if (Array.isArray(j.levels) && j.levels.length) setTourneyLevels(j.levels.map((l: any) => String(l.value)));
        if (Array.isArray(j.tourneys) && j.tourneys.length) {
          const items = j.tourneys.map((t: any) => ({ id: String(t.id), name: t.name ?? String(t.id) }));
          const { ids, names } = buildUniqueTourneyList(items);
          const sorted = sortTourneyListByPriority(ids, names);
          setTourneyIds(sorted.ids);
          setTourneyNames(sorted.names);
        }
        setFacetsLoaded(true);
      } catch (e) {
        // If facets fetch fails, fall back to computing options from the match list (as last resort)
      } finally {
        if (!aborted) setFetchingFacets(false);
      }
    })();
    return () => { aborted = true; setFetchingFacets(false); };
  }, [playerId, serverFacets]);
  const rounds = ["R128","R64","R32","R16","QF","SF","F","RR","3rd/4th","BR"];

  const initializedRef = useRef(false);
  const fullOptionsPopulatedRef = useRef(false);

  // --- Inizializzazione filtri disponibili dai match ---
  useEffect(() => {
    // If we've already populated full options from the complete dataset, and
    // `allMatchesFetched` is true, do not overwrite available options anymore.
    if (fullOptionsPopulatedRef.current && allMatchesFetched) {
      return;
    }

    // Only derive available options from `allMatches` when either:
    // 1) we've fetched the full matches list (`allMatchesFetched`) OR
    // 2) we already have server/client facets loaded (`facetsLoaded`)
    // This prevents deriving options from the SSR preview slice (10 matches) before
    // the server/client facets arrive.
    if (!allMatchesFetched && !facetsLoaded) {
      return;
    }

    if (!allMatches || allMatches.length === 0) return;

    // Compute the available options from the full (or partial) match set
    const years = Array.from(new Set(allMatches.map(m => m.year).filter((y): y is number => y != null)))
                       .sort((a,b) => b-a)
                       .map(String);
    // Prefer facets when available; otherwise populate years from allMatches but ensure URL year remains present
    if (!facetsLoaded) {
      setAvailableYears(prev => {
        if (urlYear && !years.includes(urlYear)) return [urlYear, ...years];
        return years;
      });
    } else {
      setAvailableYears(prev => {
        const facetYears = facets?.years?.map((y: any) => String(y.value)) ?? [];
        if (urlYear && !facetYears.includes(urlYear)) return [urlYear, ...facetYears];
        return facetYears;
      });
    }

    if (!facetsLoaded) {
      const availableLevels = TOURNEY_LEVELS.filter(l => allMatches.some(m => m.tourney_level === l.code));
      setTourneyLevels(prev => {
        const codes = availableLevels.map(l => l.code);
        if (urlLevel && !codes.includes(urlLevel)) return [urlLevel, ...codes];
        return codes;
      });
    } // else: tourney levels are populated from facets fetch

    // Build a map: tourney_id -> (name -> count) so we can pick a single canonical name per id
    const nameCounts = new Map<string, Map<string, number>>();
    allMatches.forEach(m => {
      if (m.tourney_level === 'D') return;
      if (!m.tourney_id || !m.tourney_name) return;
      const rawName = (m.tourney_name || '').toString().trim();
      if (!rawName) return;
      const sub = nameCounts.get(m.tourney_id) ?? new Map<string, number>();
      sub.set(rawName, (sub.get(rawName) ?? 0) + 1);
      nameCounts.set(m.tourney_id, sub);
    });

    // For each tourney_id build a single label (raw names joined by ' / ' if multiple for the same id).
    let tourneys = Array.from(nameCounts.entries()).map(([id, subMap]) => {
      const entries = Array.from(subMap.entries());
      entries.sort((a, b) => {
        // prefer higher count, then stable alphabetical order
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      });
      const rawNames = entries.map(([name]) => name.trim()).filter(Boolean);
      const seen = new Set<string>();
      const uniqNames: string[] = [];
      for (const n of rawNames) {
        if (seen.has(n)) continue;
        seen.add(n);
        uniqNames.push(n);
      }
      const label = uniqNames.length > 1 ? uniqNames.join(' / ') : (uniqNames[0] ?? entries[0][0]);
      const count = Array.from(subMap.values()).reduce((a, b) => a + b, 0);
      return { id, name: label, count };
    });
    if (urlTourney && !tourneys.some(t => t.id === urlTourney)) {
      tourneys = [{ id: urlTourney, name: urlTourney, count: 0 }, ...tourneys];
    }

    const priorityOrderByName: Record<string, number> = {
      'australian open': 0,
      'roland garros': 1,
      'wimbledon': 2,
      'us open': 3,
    };
    tourneys.sort((a,b) => {
      const na = normalizeTourneyName(a.name);
      const nb = normalizeTourneyName(b.name);
      const pa = priorityOrderByName[na] ?? 1000;
      const pb = priorityOrderByName[nb] ?? 1000;
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name);
    });

    if (!facetsLoaded) {
      const ids = tourneys.map(t => t.id);
      const names = tourneys.map(t => t.name);
      const { ids: uniqueIds, names: uniqueNames } = buildUniqueTourneyList(
        ids.map((id, i) => ({ id, name: names[i] }))
      );
      const sorted = sortTourneyListByPriority(uniqueIds, uniqueNames);
      setTourneyIds(sorted.ids);
      setTourneyNames(sorted.names);
    } else {
      // Ensure URL tourney is included if not present in facets (keep list as-is)
      if (urlTourney && !tourneyIds.includes(urlTourney)) {
        setTourneyIds(prev => [urlTourney, ...prev]);
        setTourneyNames(prev => [urlTourney, ...prev]);
      }
    }

    // Preserve current selections if user already interacted. If not, seed from URL if present.
    // If we already have full options populated, avoid overwriting current selections.
    if (!fullOptionsPopulatedRef.current) {
      setSelectedYear(prev => (prev && prev !== 'All' && years.includes(prev)) ? prev : (urlYear ?? prev ?? 'All'));
      setTourneyIdFilter(prev => (prev && prev !== 'All' && tourneys.some(t => t.id === prev)) ? prev : (urlTourney ?? prev ?? 'All'));
      // Use state-derived `tourneyLevels` rather than the block-scoped `availableLevels` which may be undefined when facets are used
      setTourneyLevelFilter(prev => (prev && prev !== 'All' && tourneyLevels.includes(prev)) ? prev : (urlLevel ?? prev ?? 'All'));

      // seed surface from URL query param or path segment (e.g. /players/slug/clay)
      setSurfaceFilter(prev => (prev && prev !== 'All') ? prev : (urlSurface ?? pathSurface ?? 'All'));

      // Use the same seed-or-keep logic for other filters so that explicit user choices are preserved
      setVsRankFilter(prev => (prev && prev !== 'All') ? prev : (hashParams.get('vsRank') ?? prev ?? 'All'));
      setVsAgeFilter(prev => (prev && prev !== 'All') ? prev : (hashParams.get('vsAge') ?? prev ?? 'All'));
      setVsHandFilter(prev => (prev && prev !== 'All') ? prev : (hashParams.get('vsHand') ?? prev ?? 'All'));
      setVsBackhandFilter(prev => (prev && prev !== 'All') ? prev : (hashParams.get('vsBackhand') ?? prev ?? 'All'));
      setVsEntryFilter(prev => (prev && prev !== 'All') ? prev : (hashParams.get('vsEntry') ?? prev ?? 'All'));
      setAsRankFilter(prev => (prev && prev !== 'All') ? prev : (hashParams.get('asRank') ?? prev ?? 'All'));
      setAsEntryFilter(prev => (prev && prev !== 'All') ? prev : (hashParams.get('asEntry') ?? prev ?? 'All'));
      setMatchSetFilter(prev => (prev && prev !== 'All') ? prev : (hashParams.get('set') ?? prev ?? 'All'));
      setFirstSetFilter(prev => (prev && prev !== 'All') ? prev : (hashParams.get('firstSet') ?? prev ?? 'All'));
      setScoreFilter(prev => (prev && prev !== 'All') ? prev : (hashParams.get('score') ?? prev ?? 'All'));
      setRoundFilter(prev => (prev && prev !== 'All') ? prev : (hashParams.get('round') ?? prev ?? 'All'));
      setResultFilter(prev => (prev && prev !== 'All') ? prev : (hashParams.get('result') ?? prev ?? 'All'));

      initializedRef.current = true;
    }

    // If this update came from a full (server) fetch of all matches, mark full-options populated so
    // subsequent partial/seeding updates won't override the lists.
    if (allMatchesFetched) {
      fullOptionsPopulatedRef.current = true;
    }

  }, [allMatches, urlYear, urlTourney, urlLevel, hashParams, allMatchesFetched]);

  // We intentionally do not mutate the browser URL when filters change.
  // Filter state remains client-only to prevent indexed query-string URLs.

  // small logs for debugging filter changes
  useEffect(() => { console.debug('[MatchesFilterPanel] selectedYear changed ->', selectedYear); }, [selectedYear]);
  useEffect(() => { console.debug('[MatchesFilterPanel] tourneyIdFilter changed ->', tourneyIdFilter); }, [tourneyIdFilter]);
  useEffect(() => { console.debug('[MatchesFilterPanel] tourneyLevelFilter changed ->', tourneyLevelFilter); }, [tourneyLevelFilter]);

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

  // Notify parent about current filters so UI such as headings can update immediately
  useEffect(() => {
    if (!onFiltersChange) return;
    // Do NOT fire before the filter panel has been initialized from URL/allMatches.
    // Without this guard, the panel fires with all-"All" on first render, overwriting
    // the URL-derived filters in the parent (AllMatches) and causing a spurious reset.
    if (!initializedRef.current) return;
    const payload: Record<string,string> = {
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
    try {
      onFiltersChange(payload);
    } catch (e) {
      // swallow
    }
  }, [selectedYear, tourneyLevelFilter, tourneyIdFilter, surfaceFilter, roundFilter, resultFilter,
      vsRankFilter, vsAgeFilter, vsHandFilter, vsBackhandFilter, vsEntryFilter, asRankFilter, asEntryFilter,
      matchSetFilter, firstSetFilter, scoreFilter, onFiltersChange]);

// --- Calcolo W-L solo per match con status true ---
useEffect(() => {
  // Base matches: if filters applied, use filteredMatches, otherwise use full matches
  // Always count against the full filtered set so W-L reflects all matches that satisfy
  // the currently selected filters (not only the visible slice).
  const matchesToCount = filteredMatches && filteredMatches.length > 0 ? filteredMatches : matches || [];

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
}, [filteredMatches, matches, playerId]);




  const winPercentage = (wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(2) : "0.00");

  const tourneyLevelLabels = TOURNEY_LEVELS.reduce((acc, l) => {
    acc[l.code] = l.label;
    return acc;
  }, {} as Record<string,string>);

  // Final safety: ensure tourney_name is unique in the rendered filter list
  const uniqueTourneyList = useMemo(() => {
    const seen = new Set<string>();
    const ids: string[] = [];
    const names: string[] = [];
    for (let i = 0; i < tourneyNames.length; i++) {
      const name = (tourneyNames[i] ?? '').toString().trim();
      if (!name) continue;
      const key = normalizeTourneyName(name);
      if (seen.has(key)) continue;
      seen.add(key);
      ids.push(tourneyIds[i] ?? name);
      names.push(name);
    }
    return { ids, names };
  }, [tourneyIds, tourneyNames]);

  // TEMP debug: log first 50 tourney names and normalized keys to trace duplicates
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const sample = tourneyNames.slice(0, 50).map((n) => ({
      raw: n,
      norm: normalizeTourneyName(String(n ?? '')),
    }));
    console.debug('[MatchesFilterPanel] tourneyNames sample', sample);
    const counts = new Map<string, number>();
    tourneyNames.forEach((n) => {
      const key = normalizeTourneyName(String(n ?? ''));
      if (!key) return;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    const dupes = Array.from(counts.entries())
      .filter(([, c]) => c > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k, c]) => ({ key: k, count: c }));
    console.debug('[MatchesFilterPanel] tourneyNames duplicates (top 10)', dupes);
  }, [tourneyNames]);

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
            tourneyIds={uniqueTourneyList.ids}
            tourneyNames={uniqueTourneyList.names}
            selectedTourneyId={tourneyIdFilter}
            setSelectedTourneyId={setTourneyIdFilter}
            surfaces={availableSurfaceOptions}
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
        </div>
      )}
    </div>
  );
}