'use client'

import React, { use, useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

import CountSection from "./CountSection";
import AgesSection from "./AgesSection";
import PercentageSection from "./PercentageSection";
import TimespanSection from "./TimespanSection";
import RoundsOnEntries from "./RoundsOnEntries";
import LeastSection from "./LeastSection";
import AverageAgeSection from "./AverageAgeSection";
import RoundsSection from "./RoundsSection";import StreakSection from './StreakSection';import TournamentHeader from "../TournamentHeader";
import TournamentTabs from "./TournamentTabs";

export default function RecordsPageClient({ params }: { params: Promise<{ id: string }> } ) {
  // Accept both a Promise (Next's server use(params)) or a plain object (useful in tests)
  let id: string = '';
  if (!params) {
    id = '';
  } else if (typeof (params as any).then === 'function') {
    try {
      // In a real Next client render this will resolve via `use`
      // @ts-ignore
      id = use(params).id;
    } catch (e) {
      // In the test environment `use` may not be available; fall back to an empty id and rely on mocked fetches
      id = '';
    }
  } else {
    id = (params as any).id ?? '';
  }

  const tournamentId = Number(id);

  const pathname = usePathname();
  const router = useRouter();

  const [tournament, setTournament] = useState<any>(null);
  const [loadingTournament, setLoadingTournament] = useState(true);

  // headerId: use numeric id from fetched header when available, otherwise fall back to numeric route id if valid
  const headerId = tournament?.id ?? (isNaN(Number(id)) ? undefined : Number(id));

  // default tab is 'count'
  const [activeTab, setActiveTab] = useState('count');
  const [activeAgeSubTab, setActiveAgeSubTab] = useState<'main' | 'winners' | 'titles' | 'youngestrounds' | 'oldestrounds'>('main');
  type PercentageSubTabState = 'overall' | 'per-round';
  type PercentageURLSub = 'overall' | 'per-round';
  type PercentageSectionProp = 'overall' | 'rounds';

  const [activePercentageSubTab, setActivePercentageSubTab] = useState<PercentageSubTabState>('overall');

  // Map local state ('overall' | 'per-round') to the prop expected by PercentageSection ('overall' | 'rounds')
  const percentageActiveSubTab: PercentageSectionProp = activePercentageSubTab === 'per-round' ? 'rounds' : 'overall';

  const didReplaceRef = useRef(false); // evita replace infinito a /records/count

  // linkId: prefer DB numeric id when available (used for edition links to ensure numeric URLs)
  const linkId = headerId ?? id;

  // Fetch tournament header (contains slug) and redirect numeric IDs to slug-preserving paths
  useEffect(() => {
    let mounted = true;
    async function loadHeader() {
      try {
        setLoadingTournament(true);
        const data = await import('@/lib/tournamentHeaderCache').then(m => m.fetchTournamentHeaderCached(id));
        if (!mounted) return;
        setTournament(data);
        setLoadingTournament(false);

        // Redirect numeric id -> slug preserving /records path (silent replace)
        if (/^\d+$/.test(id) && data?.slug && pathname && pathname.includes(`/tournaments/${id}`)) {
          const newPath = pathname.replace(`/tournaments/${id}`, `/tournaments/${data.slug}`);
          if (newPath !== pathname) {
            if (typeof window !== 'undefined' && window.history && typeof window.history.replaceState === 'function') {
              window.history.replaceState(null, '', newPath);
            } else {
              router.replace(newPath);
            }
          }
        }
      } catch (e) {
        if (!mounted) return;
        setLoadingTournament(false);
      }
    }
    loadHeader();
    return () => { mounted = false; };
  }, [id, pathname, router]);

  // Sync activeTab and subtab from pathname (supports /records, /records/<tab>, /records/<tab>/<subtab>)
  useEffect(() => {
    if (!pathname) return;
    const parts = pathname.split('/').filter(Boolean);
    const recordsIndex = parts.indexOf('records');
    const tabFromPath = recordsIndex >= 0 && parts.length > recordsIndex + 1 ? parts[recordsIndex + 1] : null;
    const subFromPath = recordsIndex >= 0 && parts.length > recordsIndex + 2 ? parts[recordsIndex + 2] : null;

    if (tabFromPath) {
      setActiveTab(tabFromPath);

      // sync subtabs for specific tabs
      if (tabFromPath === 'percentage') {
        // support both old '/rounds' path and new '/per-round' path
        setActivePercentageSubTab(subFromPath === 'per-round' || subFromPath === 'rounds' ? 'per-round' : 'overall');
      } else if (tabFromPath === 'ages') {
        // map accepted age subtabs, fallback to 'main' (note: 'winners' subtab is not available per tournament pages)
        const validAges = new Set(['main', 'titles', 'youngestrounds', 'oldestrounds']);
        setActiveAgeSubTab(validAges.has(subFromPath || '') ? (subFromPath as any) : 'main');
      }

      return;
    }

    // if path is exactly /tournaments/{id}/records, do a single replace to /records/count
    const expectedBase = `/tournaments/${linkId}/records`;
    const currentPath = (typeof window !== 'undefined' ? window.location.pathname : pathname).replace(/\/$/, '');
    if (currentPath === expectedBase && !didReplaceRef.current) {
      didReplaceRef.current = true;
      router.replace(`${expectedBase}/count`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  // Ensure per-round deep paths like /records/ages/youngestrounds/F set a full SEO title on the client
  // Declared before any early returns to preserve Hook order
  useEffect(() => {
    if (!pathname) return;
    try {
      const parts = pathname.split('/').filter(Boolean);
      const recordsIndex = parts.indexOf('records');
      if (recordsIndex < 0) return;
      const tab = parts[recordsIndex + 1];
      const sub = parts[recordsIndex + 2];
      const titleSeg = parts[recordsIndex + 3];
      if (!tab || tab !== 'ages') return;
      if (!(sub === 'youngestrounds' || sub === 'oldestrounds')) return;
      if (!titleSeg) return;

      const displayName = tournament
        ? (Array.isArray(tournament.name) ? (tournament.name as any[]).at(-1) || String(id).replace(/-/g, ' ') : (tournament.name as any) || String(id).replace(/-/g, ' '))
        : String(id).replace(/-/g, ' ');
      const humanizedDisplayName = String(displayName).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      const side = sub === 'youngestrounds' ? 'Youngest Players' : 'Oldest Players';
      const seoTitle = `${side} in ${decodeURIComponent(titleSeg)} at ${humanizedDisplayName} | Tennis Records`;
      // only set if not already the same
      const current = typeof document !== 'undefined' ? document.title || '' : '';
      if (current !== seoTitle) document.title = seoTitle;
    } catch (e) {
      // ignore
    }
  }, [pathname, tournament, id]);
  // Navigation handler: naviga a /records/:tab or /records/:tab/:sub
  const navigateToTab = (tab: string, sub?: string) => {
    const subSegment = sub ? `/${encodeURIComponent(sub)}` : '';
    const newPath = `/tournaments/${linkId}/records/${encodeURIComponent(tab)}${subSegment}`;
    if (typeof window !== 'undefined' && newPath !== window.location.pathname) {
      router.push(newPath);
    } else {
      // if nothing changes in path, still update local state immediately
      setActiveTab(tab);
      if (tab === 'percentage' && sub) setActivePercentageSubTab(sub === 'per-round' ? 'per-round' : 'overall');
      if (tab === 'ages' && sub) {
        const validAges = new Set(['main', 'winners', 'titles', 'youngestrounds', 'oldestrounds']);
        setActiveAgeSubTab(validAges.has(sub) ? (sub as any) : 'main');
      }
    }
  };

  // specific handlers for subtabs (pass to TournamentTabs)
  const navigateToPercentageSub = (sub: PercentageURLSub) => navigateToTab('percentage', sub);
  const navigateToAgeSub = (sub: 'main' | 'winners' | 'titles' | 'youngestrounds' | 'oldestrounds') =>
    navigateToTab('ages', sub);

  if (loadingTournament) {
    return (
      <div className="text-white">Loading...</div>
    );
  }

  // Compute a display name for the H1: prefer DB name when available, otherwise humanize the route id
  const displayName = tournament
    ? (Array.isArray(tournament.name) ? (tournament.name as any[]).at(-1) || String(id).replace(/-/g, ' ') : (tournament.name as any) || String(id).replace(/-/g, ' '))
    : String(id).replace(/-/g, ' ');
  const humanizedDisplayName = String(displayName).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());



  // Compute the page H1 so it matches the server metadata title (minus the "| Tennis Records" suffix)
  const pageHeading = (() => {
    if (!activeTab) return `${humanizedDisplayName} Records`;
    if (activeTab === 'rounds') return `${humanizedDisplayName} Records by Round`;
    if (activeTab === 'count') return `${humanizedDisplayName} Open Era Records`;
    if (activeTab === 'rounds-on-entries') return `${humanizedDisplayName} Round Efficiency by Entries`;
    if (activeTab === 'streak') return `${humanizedDisplayName} Longest Winning Streaks`;
    if (activeTab === 'least') return `${humanizedDisplayName} Least Games Lost to Reach a Round`;
    if (activeTab === 'average-age') return `${humanizedDisplayName} Average Age Records`;
    if (activeTab === 'timespan') return `${humanizedDisplayName} Timespan Records`;
    const tabLabels: Record<string, string> = {
      count: 'Open Era Records',
      rounds: 'Records by Round',
      ages: 'Ages',
      percentage: 'Percentages',
      timespan: 'Timespans',
      'rounds-on-entries': 'Round Efficiency by Entries',
      streak: 'Longest Winning Streaks',
      least: 'Least Games Lost to Reach a Round',
      'average-age': 'Average Age Records',
    };
    const typeLabel = tabLabels[activeTab] ?? String(activeTab).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return `${humanizedDisplayName} ${typeLabel}`;
  })();

  return (
    <>
      <TournamentHeader id={headerId} />

      {/* Intro description (client-rendered under the header) */}
      <h3 className="text-base text-gray-300 w-full leading-relaxed mb-6">
        {(() => {
          const base = 'Explore match-level data, historical trends, and the players who left their mark on this tournament.';
          if (activeTab === 'least') return `A curated collection of least games lost to reach a round at ${humanizedDisplayName}. ${base}`;
          if (activeTab === 'rounds') return `A curated collection of records by round at ${humanizedDisplayName}. ${base}`;
          if (activeTab === 'count') return `A curated collection of records at ${humanizedDisplayName}. Titles, Wins Matches Played and Appearances. ${base}`;
          return `A curated collection of ${activeTab ? activeTab.replace(/[-_]+/g, ' ') : 'records'} at ${humanizedDisplayName}. ${base}`;
        })()}
      </h3>

      <TournamentTabs
        activeTab={activeTab}
        setActiveTab={(t: string) => { if (t === 'ages' || t === 'percentage') { setActiveTab(t); } else { navigateToTab(t); } }}             // naviga al tab
        activeAgeSubTab={activeAgeSubTab}
        setActiveAgeSubTab={navigateToAgeSub}                      // naviga subtab ages via path
        activePercentageSubTab={activePercentageSubTab}
        setActivePercentageSubTab={navigateToPercentageSub}        // naviga subtab percentage via path
      />

      <div
        className="rounded-2xl bg-gray-900/50 py-4 px-0 shadow-inner"
        style={{
          ['--col-1' as any]: '240px',
          ['--col-2' as any]: '110px',
          ['--col-3' as any]: '110px',
          ['--col-4' as any]: '80px',
          ['--pcol-1' as any]: '240px',
          ['--pcol-2' as any]: '110px',
          ['--pcol-3' as any]: '110px',
          ['--pcol-4' as any]: '80px'
        }}
      >
        {activeTab === 'count' && <CountSection tournamentId={id} />}
        {activeTab === 'rounds' && <RoundsSection tournamentId={id} />}
        {activeTab === 'ages' && (
          <AgesSection
            id={id}
            linkId={linkId}
            activeSubTab={activeAgeSubTab}
          />
        )}
        {activeTab === 'percentage' && (
          <PercentageSection
            id={id}
            activeSubTab={percentageActiveSubTab}
          />
        )}
        {activeTab === 'timespan' && <TimespanSection id={id} />}
        {activeTab === 'rounds-on-entries' && <RoundsOnEntries id={id} />}
        {activeTab === 'streak' && <StreakSection id={id} />}
        {activeTab === 'least' && <LeastSection id={id} linkId={linkId} />}
        {activeTab === 'average-age' && <AverageAgeSection id={id} />}
      </div>
    </>
  );
}
