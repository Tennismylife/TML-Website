'use client'

import { use, useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

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

type TabKey = 'count' | 'ages' | 'percentage' | 'timespan' | 'rounds-on-entries' | 'least' | 'average-age' | 'rounds';
type AgeSubTab = 'main' | 'titles' | 'youngestrounds' | 'oldestrounds';
type PercentageSubTab = 'overall' | 'per-round';

export default function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tournamentId = Number(id);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tournament, setTournament] = useState<any>(null);
  const [loadingTournament, setLoadingTournament] = useState(true);

  const [activeTab, setActiveTab] = useState<TabKey>('count');
  const [activeAgeSubTab, setActiveAgeSubTab] = useState<AgeSubTab>('main');
  const [activePercentageSubTab, setActivePercentageSubTab] = useState<PercentageSubTab>('overall');

  // --- Fetch tournament data ---
  useEffect(() => {
    fetch(`/api/tournaments/${id}`)
      .then(res => res.json())
      .then(data => {
        setTournament(data);
        setLoadingTournament(false);
      })
      .catch(() => setLoadingTournament(false));
  }, [id]);

  // --- Sync activeTab from URL only once, evitando loop ---
  useEffect(() => {
    const tab = searchParams.get("tab") as TabKey | null;
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // non includere activeTab qui

  // --- Sync URL when activeTab changes ---
  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (activeTab && activeTab !== 'count') {
      if (params.get("tab") !== activeTab) {
        params.set("tab", activeTab);
        const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
        router.replace(newUrl, { scroll: false });
      }
    } else if (params.get("tab")) {
      params.delete("tab");
      const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      router.replace(newUrl, { scroll: false });
    }
  }, [activeTab, router, pathname, searchParams]);

  if (loadingTournament) {
    return (
      <div className="w-full mx-auto p-8 text-white" style={{ backgroundColor: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(6px)', minHeight: '100vh' }}>
        Loading...
      </div>
    );
  }

  return (
    <main className="w-full mx-auto p-8 text-white" style={{ backgroundColor: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(6px)', minHeight: '100vh' }}>
      <TournamentHeader id={tournamentId} />

      {/* Tabs */}
      <TournamentTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeAgeSubTab={activeAgeSubTab}
        setActiveAgeSubTab={setActiveAgeSubTab}
        activePercentageSubTab={activePercentageSubTab}
        setActivePercentageSubTab={setActivePercentageSubTab}
      />

      {/* Section Rendering */}
      <div className="rounded-2xl bg-gray-900/50 p-4 shadow-inner">
        {activeTab === 'count' && <CountSection tournamentId={id} />}
        {activeTab === 'rounds' && <RoundsSection tournamentId={id} />}
        {activeTab === 'ages' && <AgesSection id={id} activeSubTab={activeAgeSubTab} />}
        {activeTab === 'percentage' && <PercentageSection id={id} activeSubTab={activePercentageSubTab === 'per-round' ? 'rounds' : activePercentageSubTab} />}
        {activeTab === 'timespan' && <TimespanSection id={id} />}
        {activeTab === 'rounds-on-entries' && <RoundsOnEntries id={id} />}
        {activeTab === 'least' && <LeastSection id={id} />}
        {activeTab === 'average-age' && <AverageAgeSection id={id} />}
      </div>
    </main>
  );
}
