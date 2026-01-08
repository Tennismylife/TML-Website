'use client'

import { use, useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

import CountSection from "./CountSection";
import AgesSection from "./AgesSection";
import PercentageSection from "./PercentageSection";
import TimespanSection from "./TimespanSection";
import RoundsOnEntries from "./RoundsOnEntries";
import LeastSection from "./LeastSection";
import AverageAgeSection from "./AverageAgeSection";
import RoundsSection from "./RoundsSection";
import TournamentHeader from "../TournamentHeader";
import TournamentTabs from "./TournamentTabs";

export default function RecordsPageClient({ params }: { params: Promise<{ id: string }> } ) {
  const { id } = use(params);
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
        // map accepted age subtabs, fallback to 'main'
        const validAges = new Set(['main', 'winners', 'titles', 'youngestrounds', 'oldestrounds']);
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
      <div
        className="w-full mx-auto p-8 text-white"
        style={{ backgroundColor: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(6px)', minHeight: '100vh' }}
      >
        Loading...
      </div>
    );
  }

  return (
    <main
      className="w-full mx-auto p-8 text-white"
      style={{ backgroundColor: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(6px)', minHeight: '100vh' }}
    >
      <TournamentHeader id={headerId} />

      <TournamentTabs
        activeTab={activeTab}
        setActiveTab={(t: string) => { if (t === 'ages' || t === 'percentage') { setActiveTab(t); } else { navigateToTab(t); } }}             // naviga al tab
        activeAgeSubTab={activeAgeSubTab}
        setActiveAgeSubTab={navigateToAgeSub}                      // naviga subtab ages via path
        activePercentageSubTab={activePercentageSubTab}
        setActivePercentageSubTab={navigateToPercentageSub}        // naviga subtab percentage via path
      />

      <div
        className="rounded-2xl bg-gray-900/50 p-4 shadow-inner"
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
        {activeTab === 'least' && <LeastSection id={id} linkId={linkId} />}
        {activeTab === 'average-age' && <AverageAgeSection id={id} />}
      </div>
    </main>
  );
}
