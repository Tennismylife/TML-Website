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

export default function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tournamentId = Number(id);

  const pathname = usePathname();
  const router = useRouter();

  const [tournament, setTournament] = useState<any>(null);
  const [loadingTournament, setLoadingTournament] = useState(true);

  // default tab is 'count'
  const [activeTab, setActiveTab] = useState('count');
  const [activeAgeSubTab, setActiveAgeSubTab] = useState<'main' | 'winners' | 'titles' | 'youngestrounds' | 'oldestrounds'>('main');
  type PercentageSubTabState = 'overall' | 'per-round';
  type PercentageSubTabProp = 'overall' | 'rounds';

  const [activePercentageSubTab, setActivePercentageSubTab] = useState<PercentageSubTabState>('overall');

  const percentageActiveSubTab: PercentageSubTabProp = activePercentageSubTab === 'per-round' ? 'rounds' : 'overall';

  const didReplaceRef = useRef(false); // evita replace infinito a /records/count

  // Fetch tournament data
  useEffect(() => {
    fetch(`/api/tournaments/${id}`)
      .then(res => res.json())
      .then(data => {
        setTournament(data);
        setLoadingTournament(false);
      })
      .catch(() => setLoadingTournament(false));
  }, [id]);

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
        setActivePercentageSubTab(subFromPath === 'rounds' ? 'per-round' : 'overall');
      } else if (tabFromPath === 'ages') {
        // map accepted age subtabs, fallback to 'main'
        const validAges = new Set(['main', 'winners', 'titles', 'youngestrounds', 'oldestrounds']);
        setActiveAgeSubTab(validAges.has(subFromPath || '') ? (subFromPath as any) : 'main');
      }

      return;
    }

    // if path is exactly /tournaments/{id}/records, do a single replace to /records/count
    const expectedBase = `/tournaments/${id}/records`;
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
    const newPath = `/tournaments/${id}/records/${encodeURIComponent(tab)}${subSegment}`;
    if (typeof window !== 'undefined' && newPath !== window.location.pathname) {
      router.push(newPath);
    } else {
      // if nothing changes in path, still update local state immediately
      setActiveTab(tab);
      if (tab === 'percentage' && sub) setActivePercentageSubTab(sub === 'rounds' ? 'per-round' : 'overall');
      if (tab === 'ages' && sub) {
        const validAges = new Set(['main', 'winners', 'titles', 'youngestrounds', 'oldestrounds']);
        setActiveAgeSubTab(validAges.has(sub) ? (sub as any) : 'main');
      }
    }
  };

  // specific handlers for subtabs (pass to TournamentTabs)
  const navigateToPercentageSub = (sub: PercentageSubTabProp) => navigateToTab('percentage', sub);
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
      <TournamentHeader id={tournamentId} />

      <TournamentTabs
        activeTab={activeTab}
        setActiveTab={(t: string) => navigateToTab(t)}             // naviga al tab
        activeAgeSubTab={activeAgeSubTab}
        setActiveAgeSubTab={navigateToAgeSub}                      // naviga subtab ages via path
        activePercentageSubTab={activePercentageSubTab}
        setActivePercentageSubTab={navigateToPercentageSub}        // naviga subtab percentage via path
      />

      <div className="rounded-2xl bg-gray-900/50 p-4 shadow-inner">
        {activeTab === 'count' && <CountSection tournamentId={id} />}
        {activeTab === 'rounds' && <RoundsSection tournamentId={id} />}
        {activeTab === 'ages' && (
          <AgesSection
            id={id}
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
        {activeTab === 'least' && <LeastSection id={id} />}
        {activeTab === 'average-age' && <AverageAgeSection id={id} />}
      </div>
    </main>
  );
}
