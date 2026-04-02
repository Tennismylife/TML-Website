'use client'

import React, { useState, useEffect } from "react";
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

/** Safely extract a non-numeric display name from a Json? tournament.name field.
 *  Returns `fallback` if the value is missing, a bare number, or a pure-digit string. */
function safeTournamentName(name: any, fallback: string): string {
  if (!name) return fallback;
  if (typeof name === 'number' || typeof name === 'boolean') return fallback;
  if (typeof name === 'string') {
    const t = name.trim();
    return (t && !/^\d+$/.test(t)) ? t : fallback;
  }
  if (Array.isArray(name)) {
    for (const v of name) {
      const r = safeTournamentName(v, '');
      if (r) return r;
    }
    return fallback;
  }
  if (typeof name === 'object') {
    for (const v of Object.values(name as object)) {
      const r = safeTournamentName(v, '');
      if (r) return r;
    }
    return fallback;
  }
  return fallback;
}

interface CountItem { id: string | number; name: string; ioc: string; count: number; }
interface InitialCountData {
  titles: CountItem[];
  wins: CountItem[];
  played: CountItem[];
  entries: CountItem[];
}

export default function RecordsPageClient({ params, initialCountData, markdownHtml }: { params: Promise<{ id: string }>; initialCountData?: InitialCountData; markdownHtml?: string }) {
  // Accept both a Promise (Next's server use(params)) or a plain object (useful in tests)
  // Resolve params into a stable `id` state so hooks and effects run predictably
  const [id, setId] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (params && typeof (params as any).then === 'function') {
          const p = await params;
          if (!mounted) return;
          setId(p?.id ?? '');
        } else {
          setId((params as any)?.id ?? '');
        }
      } catch (e) {
        if (!mounted) return;
        setId('');
      }
    })();
    return () => { mounted = false; };
  }, [params]);

  const tournamentId = Number(id);

  const pathname = usePathname();
  const router = useRouter();

  const [tournament, setTournament] = useState<any>(null);
  const [loadingTournament, setLoadingTournament] = useState(true);

  // headerId: use numeric id from fetched header when available, otherwise fall back to numeric route id if valid
  const headerId = tournament?.id ?? (isNaN(Number(id)) ? undefined : Number(id));

  // default tab is 'count' — initial data is passed from the server component for SSR
  const [activeTab, setActiveTab] = useState('count');
  const [activeAgeSubTab, setActiveAgeSubTab] = useState<'main' | 'winners' | 'titles' | 'youngestrounds' | 'oldestrounds'>('main');
  type PercentageSubTabState = 'overall' | 'per-round';
  type PercentageURLSub = 'overall' | 'per-round';
  type PercentageSectionProp = 'overall' | 'rounds';

  const [activePercentageSubTab, setActivePercentageSubTab] = useState<PercentageSubTabState>('overall');

  // Map local state ('overall' | 'per-round') to the prop expected by PercentageSection ('overall' | 'rounds')
  const percentageActiveSubTab: PercentageSectionProp = activePercentageSubTab === 'per-round' ? 'rounds' : 'overall';

  // linkId: prefer DB numeric id when available (used for edition links to ensure numeric URLs)
  const linkId = headerId ?? id;
  // When constructing top‑level *paths* (tabs) we want the human
  // slug if one has been fetched, otherwise fall back to whatever the
  // route originally contained. `linkId` is intentionally kept numeric
  // because it is still used by the section components for season/year
  // links where stability matters.
  const pathId = (tournament && typeof tournament.slug === 'string' && tournament.slug)
    || id;

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
      // /records/count is not a valid standalone URL — redirect to the hub /records
      if (tabFromPath === 'count' && !subFromPath) {
        const basePath = `/tournaments/${pathId}/records`;
        router.replace(basePath);
        setActiveTab('count');
        return;
      }

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

    // if path is exactly /tournaments/{id}/records, show the count tab without changing the URL
    // (keeping the canonical /records URL intact for SEO — avoids pushing to the noindex [tab] catch-all)
    const expectedBase = `/tournaments/${pathId}/records`;
    const currentPath = (typeof window !== 'undefined' ? window.location.pathname : pathname).replace(/\/$/, '');
    if (currentPath === expectedBase) {
      setActiveTab('count');
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

      const displayName = safeTournamentName(tournament?.name, String(id).replace(/-/g, ' '));
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
    // prefer slug for the navigation path when it's been loaded
    const chosenId = pathId;
    // 'count' is the default/hub tab — its canonical URL is /records (no extra segment)
    const newPath = tab === 'count'
      ? `/tournaments/${chosenId}/records`
      : `/tournaments/${chosenId}/records/${encodeURIComponent(tab)}${subSegment}`;
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

  // For slug routes, trust the slug-derived name to avoid historical alias mismatches.
  // Example: /tournaments/miami-masters should always render "Miami Masters".
  const slugDisplayName = String(pathId || id).replace(/[-_]+/g, ' ');
  const displayName = /^\d+$/.test(String(id))
    ? safeTournamentName(tournament?.name, slugDisplayName)
    : slugDisplayName;
  const humanizedDisplayName = String(displayName).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const normalizedPathname = pathname ? pathname.replace(/\/$/, '') : '';
  const isRecordsHome = normalizedPathname === `/tournaments/${pathId}/records`;



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
      count: 'Overview',
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

      {isRecordsHome && (
        <section className="mb-8 p-6 md:p-8 bg-gray-900/40 rounded-2xl border border-gray-800/80 shadow-lg">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100 mb-4">{humanizedDisplayName} Records & Statistics</h1>
          <div className="space-y-4 text-gray-300 text-sm md:text-base leading-relaxed">
            <p>
              Welcome to the ultimate hub for <strong>{humanizedDisplayName} records</strong>. This extensive database aggregates Open Era statistics, match details, and historical achievements for one of tennis's most prestigious events. Navigate through our curated data to discover which players have left their mark on the tournament.
            </p>
            <p>
              Our tables are continually updated to reflect the latest editions, providing deep insights into men's singles performances. You can explore everything from the players claiming the most championship <strong>titles and match wins</strong>, to specialized metrics like <strong>winning percentages</strong>, the <strong>youngest and oldest champions</strong>, and the longest consecutive <strong>winning streaks</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
            <div className="bg-gray-800/40 p-5 rounded-xl border border-gray-700/30">
              <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">🏆 Titles & Wins</h3>
              <p className="text-xs text-gray-400 leading-relaxed">Discover the ultimate champions. See who has lifted the trophy the most times and who holds the record for the most match wins and appearances in the main draw.</p>
            </div>
            <div className="bg-gray-800/40 p-5 rounded-xl border border-gray-700/30">
              <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">⏳ Age Records</h3>
              <p className="text-xs text-gray-400 leading-relaxed">Tennis spans generations. Investigate the youngest prodigies to break through and the oldest veterans to sustain success across different rounds.</p>
            </div>
            <div className="bg-gray-800/40 p-5 rounded-xl border border-gray-700/30">
              <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">📈 Streaks & Stats</h3>
              <p className="text-xs text-gray-400 leading-relaxed">Analyze dominance over time. Explore the longest uninterrupted winning streaks and the highest winning percentages among the sport's elite.</p>
            </div>
          </div>

          {markdownHtml && (
            <div className="mt-8 pt-6 border-t border-gray-700/60">
              <div
                className="mc-records-content bg-gray-800/60 border border-gray-700/50 rounded-xl p-6 prose prose-invert max-w-none [&_h2]:text-[0.8rem] [&_h2]:uppercase [&_h2]:tracking-widest [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-1 [&_h2]:pb-1 [&_h2]:border-b [&_h2]:border-gray-700/50 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-gray-200 [&_p]:mt-0 [&_p]:mb-2"
                dangerouslySetInnerHTML={{ __html: markdownHtml }}
              />
            </div>
          )}
        </section>
      )}

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
        {activeTab === 'count' && <CountSection tournamentId={id} initialData={initialCountData} />}
        {activeTab === 'rounds' && <RoundsSection tournamentId={id} />}
        {activeTab === 'ages' && (
          <AgesSection
            id={id}
            linkId={linkId}
            pathId={pathId}
            activeSubTab={activeAgeSubTab}
          />
        )}
        {activeTab === 'percentage' && (
          <PercentageSection
            id={id}
            activeSubTab={percentageActiveSubTab}
          />
        )}
        {activeTab === 'timespan' && <TimespanSection id={id} pathId={pathId} />}
        {activeTab === 'rounds-on-entries' && <RoundsOnEntries id={id} pathId={pathId} />}
        {activeTab === 'streak' && <StreakSection id={id} />}
        {activeTab === 'least' && <LeastSection id={id} linkId={linkId} pathId={pathId} />}
        {activeTab === 'average-age' && <AverageAgeSection id={id} />}
      </div>
    </>
  );
}
