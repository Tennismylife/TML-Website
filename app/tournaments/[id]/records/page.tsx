'use client'

import { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTourneyHref } from "@/lib/utils";
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

// Helper functions for display name
function extractName(nameField: any): string {
  if (!nameField) return '';
  if (typeof nameField === 'string') return nameField;
  if (typeof nameField === 'number' || typeof nameField === 'boolean') return String(nameField);
  if (Array.isArray(nameField)) {
    for (const v of nameField) {
      const r = extractName(v);
      if (r) return r;
    }
    return '';
  }
  if (typeof nameField === 'object') {
    for (const v of Object.values(nameField)) {
      const r = extractName(v);
      if (r) return r;
    }
    return '';
  }
  return '';
}

function humanizeName(name: any) {
  const s = String(name || '');
  return s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
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

  const percentageActiveSubTab: PercentageSectionProp = activePercentageSubTab === 'per-round' ? 'rounds' : 'overall';

  const didReplaceRef = useRef(false); // evita replace infinito a /records/count

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

        // Redirect numeric id -> slug preserving /records path (silent replace to avoid bounce)
        if (/^\d+$/.test(id) && data?.slug && pathname && pathname.includes(`/tournaments/${id}`)) {
          const newPath = pathname.replace(`/tournaments/${id}`, `/tournaments/${data.slug}`);
          if (newPath !== pathname) {
            if (typeof window !== 'undefined' && window.history && typeof window.history.replaceState === 'function') {
              // Replace URL without triggering a client navigation — keeps the page loaded once
              window.history.replaceState(null, '', newPath);
            } else {
              // fallback to router.replace if history API not available
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

    // if path is exactly /tournaments/{id}/records, do a single silent replace to /records/count (no navigation)
    const expectedBase = `/tournaments/${headerId ?? id}/records`;
    const currentPath = (typeof window !== 'undefined' ? window.location.pathname : pathname).replace(/\/$/, '');
    if (currentPath === expectedBase && !didReplaceRef.current) {
      didReplaceRef.current = true;
      const newCountPath = `${expectedBase}/count`;
      if (typeof window !== 'undefined' && window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState(null, '', newCountPath);
        // ensure UI state reflects the new path without triggering navigation
        setActiveTab('count');
      } else {
        // fallback if history API not available
        router.replace(newCountPath);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Navigation handler: naviga a /records/:tab or /records/:tab/:sub
  const navigateToTab = (tab: string, sub?: string) => {
    const subSegment = sub ? `/${encodeURIComponent(sub)}` : '';
    const baseId = headerId ?? id;
    const newPath = `/tournaments/${baseId}/records/${encodeURIComponent(tab)}${subSegment}`;
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
      <div className="w-full flex justify-start mb-6">
        <Link
          href={getTourneyHref({ id: String(headerId ?? id) })}
          title="Back to tournament"
          aria-label="Back to tournament"
          className="inline-flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold rounded-full shadow-lg hover:scale-105 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Tournament</span>
        </Link>
      </div>

      <TournamentHeader id={headerId} />

      <TournamentTabs
        activeTab={activeTab}
        setActiveTab={(t: string) => { if (t === 'ages' || t === 'percentage') { setActiveTab(t); } else { navigateToTab(t); } }}             // naviga al tab
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
            linkId={headerId ?? id}
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
        {activeTab === 'least' && <LeastSection id={id} linkId={headerId ?? id} />}
        {activeTab === 'average-age' && <AverageAgeSection id={id} />}
      </div>
    </main>
  );
}
