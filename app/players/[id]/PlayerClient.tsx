"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Flag from '@/components/Flag';
import PlayerTabs from "./PlayerTabs";
import { Player } from "@/types";
import { getPlayerHref } from '@/lib/utils';

export default function PlayerClient(props: any) {
  const params = props.params ?? {};
  const playerId = params?.id ?? props.params?.id;
  const initialMatches = props.initialMatches;
  const initialHeading = props.initialHeading;
  const initialTotals = props.initialTotals;
  const initialFacets = props.initialFacets;
  const initialSeasonStats = props.initialSeasonStats;
  const initialSeasonYear = props.initialSeasonYear;

  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  // Lifted UI state for child tabs (filters)
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      if (typeof window === 'undefined') return 'matches';
      const parts = window.location.pathname.split('/');
      const pathTab = parts[3] || null; // /players/<slug>/<tab>
      return pathTab || (new URLSearchParams(window.location.search).get('tab')) || 'matches';
    } catch {
      return 'matches';
    }
  });

  const [tournamentsFilters, setTournamentsFilters] = useState(() => ({
    tourney: "",
    level: "All",
    surface: "All",
    round: "All",
    season: "All",
    search: "",
    sub: "events",
  }));

  // helpers to allow child components to call setFilters with partial objects (merge)
  const setTournamentsFiltersPartial = (partial: Partial<typeof tournamentsFilters>) => {
    setTournamentsFilters(prev => ({ ...prev, ...partial }));
  };

  const [h2hFilters, setH2HFilters] = useState(() => ({
    year: "All" as number | "All",
    level: "All",
    surface: "All",
    round: "All",
    tournament: "All",
    opponent: "",
  }));

  // URL sync guards
  const lastAppliedRef = React.useRef<string | null>(null);
  const replaceTimerRef = React.useRef<number | null>(null);


  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // ⬇️ API URL LASCIATO IDENTICO
        const res = await fetch(
          `/api/players?id=${encodeURIComponent(playerId)}&slug=${encodeURIComponent(playerId)}`,
          { signal: controller.signal }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: Player = await res.json();
        setPlayer(data);

        // slug SOLO per l'URL del browser
        const slug = (data.atpname || data.player || data.id)
          .toString()
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-");

        // Build canonical path-based URL preserving other query params and mapping any existing ?tab to path segment
        const params = new URLSearchParams(window.location.search);
        const explicitTab = params.get('tab');
        if (explicitTab) params.delete('tab');
        const pathParts = window.location.pathname.split('/');
        const tabFromPath = pathParts[3];
        const finalTab = explicitTab || tabFromPath || 'matches';
        const search = params.toString();
        // Preserve a path-based year segment when present (e.g. /players/slug/season/2026)
        const pathYearSegment = (pathParts[4] && /^[0-9]{4}$/.test(pathParts[4])) ? `/${pathParts[4]}` : '';
        const desired = `${getPlayerHref(slug)}/${encodeURIComponent(finalTab)}${pathYearSegment}${search ? `?${search}` : ''}`;
        window.history.replaceState(null, "", desired);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError("Errore nel caricamento del giocatore.");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [playerId, router]);

  // Initialize lifted filters from current URL on mount
  const initializedRef = React.useRef(false);

  useEffect(() => {
    try {
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
      const t = params.get('tab');
      if (t) setActiveTab(t);

      // tournaments
      setTournamentsFilters({
        tourney: params.get('tourney') || "",
        level: params.get('level') ? (params.get('level') as string) : "All",
        surface: params.get('surface') || "All",
        round: params.get('round') || "All",
        season: params.get('year') || params.get('season') || "All",
        search: params.get('search') || "",
        sub: params.get('sub') || "events",
      });

      // h2h
      setH2HFilters({
        year: params.get('year') ? Number(params.get('year')) : "All",
        level: params.get('level') || "All",
        surface: params.get('surface') || "All",
        round: params.get('round') || "All",
        tournament: params.get('tourney') || "All",
        opponent: params.get('opponent') || "",
      });

      // mark initialization complete so the URL-sync effect doesn't overwrite query params
      initializedRef.current = true;
    } catch (err) {
      // ignore
    }
  }, []);

  // Centralized URL sync for lifted state
  useEffect(() => {
    const buildAndReplace = () => {
      // If the location's path-based tab doesn't match our activeTab, respect the path and update state instead
      try {
        const pathTabNow = typeof window !== 'undefined' ? window.location.pathname.split('/')[3] : null;
        if (pathTabNow && pathTabNow !== activeTab) {
          // If a user-initiated navigation was initiated very recently, do not override it; wait for it to settle
          const recent = typeof window !== 'undefined' && (window as any).__player_navigation_recent && (Date.now() - (window as any).__player_navigation_recent < 1200);
          if (recent) {
            console.debug('[PlayerClient] buildAndReplace: recent navigation to', pathTabNow, 'in-flight — skipping sync');
            return;
          }
          // otherwise sync local state to the path and avoid clobbering
          setActiveTab(pathTabNow);
          console.debug('[PlayerClient] buildAndReplace: observed external nav to', pathTabNow, '— syncing state and skipping replace');
          return;
        }
      } catch (e) {
        // ignore
      }

      // Preserve existing query parameters and merge with updated ones for the current tab
      const params = new URLSearchParams(window.location.search);
      // Remove any legacy 'tab' param so it doesn't coexist with path-based tab
      params.delete('tab');

      // For tournaments tab, explicitly set (or delete) tournament-related params according to state
      if (activeTab === 'tournaments') {
        if (tournamentsFilters.tourney) params.set('tourney', tournamentsFilters.tourney);
        else params.delete('tourney');

        if (tournamentsFilters.level && tournamentsFilters.level !== 'All') params.set('level', tournamentsFilters.level);
        else params.delete('level');

        if (tournamentsFilters.surface && tournamentsFilters.surface !== 'All') params.set('surface', tournamentsFilters.surface);
        else params.delete('surface');

        if (tournamentsFilters.round && tournamentsFilters.round !== 'All') params.set('round', tournamentsFilters.round);
        else params.delete('round');

        if (tournamentsFilters.season && tournamentsFilters.season !== 'All') params.set('year', String(tournamentsFilters.season));
        else params.delete('year');

        if (tournamentsFilters.search && tournamentsFilters.search.trim()) params.set('search', tournamentsFilters.search);
        else params.delete('search');

        if (tournamentsFilters.sub) params.set('sub', tournamentsFilters.sub);
        else params.delete('sub');
      }

      // For h2h tab, explicitly set / delete relevant params
      if (activeTab === 'h2h') {
        if (h2hFilters.year && h2hFilters.year !== 'All') params.set('year', String(h2hFilters.year));
        else params.delete('year');

        if (h2hFilters.level && h2hFilters.level !== 'All') params.set('level', h2hFilters.level);
        else params.delete('level');

        if (h2hFilters.surface && h2hFilters.surface !== 'All') params.set('surface', h2hFilters.surface);
        else params.delete('surface');

        if (h2hFilters.round && h2hFilters.round !== 'All') params.set('round', h2hFilters.round);
        else params.delete('round');

        if (h2hFilters.tournament && h2hFilters.tournament !== 'All') params.set('tourney', h2hFilters.tournament);
        else params.delete('tourney');

        if (h2hFilters.opponent && h2hFilters.opponent.trim()) params.set('opponent', h2hFilters.opponent);
        else params.delete('opponent');
      }

      // Only keep 'sub' for tabs that accept it (season)
      if (activeTab !== 'season') {
        params.delete('sub');
      }

      // Build new pathname with the active tab as the 3rd segment
      const pathParts = window.location.pathname.split('/');
      pathParts[3] = activeTab;
      const newQs = params.toString();
      const newUrl = `${pathParts.join('/')}${newQs ? `?${newQs}` : ''}`;

      if (lastAppliedRef.current === newUrl) return;
      lastAppliedRef.current = newUrl;
      if (replaceTimerRef.current) clearTimeout(replaceTimerRef.current);
      replaceTimerRef.current = window.setTimeout(() => {
        try {
          // If a user-initiated navigation to the desired path happened very recently, avoid overwriting it
          const recent = typeof window !== 'undefined' && (window as any).__player_navigation_recent && (Date.now() - (window as any).__player_navigation_recent < 1200);
          if (recent) {
            console.debug('[PlayerClient] skipping replace due to recent user navigation ->', newUrl);
            (window as any).__player_navigation_recent = 0;
            lastAppliedRef.current = null;
            replaceTimerRef.current = null;
            return;
          }

          console.debug('[PlayerClient] buildAndReplace ->', newUrl);
          router.replace(newUrl, { scroll: false });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.debug('[PlayerPage] router.replace failed:', err);
          lastAppliedRef.current = null;
        }
        replaceTimerRef.current = null;
      }, 150);
    };

    // Don't overwrite the URL until initial URL-derived state has been applied
    if (!initializedRef.current) return;

    buildAndReplace();
  }, [activeTab, tournamentsFilters, h2hFilters, router]);

  if (loading) return <p className="p-4 text-gray-400">Loading…</p>;
  if (error) return <p className="p-4 text-red-400">{error}</p>;
  if (!player) return null;

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "matches", label: "Matches" },
    { id: "season", label: "Seasons" },
    { id: "tournaments", label: "Tournaments" },
    { id: "h2h", label: "H2H" },
    { id: "performance", label: "Performance" },
    { id: "statistics", label: "Statistics" },
  ];

  return (
    <main className="min-h-screen w-full bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gray-800/95 backdrop-blur-md border-b border-gray-700 py-3 px-0">
        <div className="w-full flex items-center gap-2">
          {player.ioc && <Flag ioc={player.ioc} className="w-5 h-4 inline-block mr-2" />}
          <h1 className="text-2xl font-bold">{player.atpname}</h1>
        </div>
      </header>

      {/* Tabs */}
      <PlayerTabs
        player={player}
        tabs={tabs}
        initialTab={"matches"}
        setTab={setActiveTab}
        tournamentsFilters={tournamentsFilters}
        // pass partial-setter wrapper so children can call setFilters({ sub: 'events' })
        setTournamentsFilters={setTournamentsFiltersPartial}
        h2hFilters={h2hFilters}
        setH2HFilters={(partial: Partial<typeof h2hFilters>) => setH2HFilters(prev => ({ ...prev, ...partial }))}
        initialMatches={initialMatches}
        initialHeading={initialHeading}
        initialTotals={initialTotals}
        initialFacets={initialFacets}
        initialSeasonStats={initialSeasonStats}
        initialSeasonYear={initialSeasonYear}
      />

      {/* Content */}
      <section className="py-6 px-6">
        {/* sections like profile, matches, tournaments... */}
      </section>
    </main>
  );
}
