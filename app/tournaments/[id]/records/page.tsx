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

export default function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tournamentId = Number(id);

  const searchParams = useSearchParams();
  const [tournament, setTournament] = useState<any>(null);
  const [loadingTournament, setLoadingTournament] = useState(true);

  const [activeTab, setActiveTab] = useState('count');
  const [activeAgeSubTab, setActiveAgeSubTab] = useState<'main' | 'winners' | 'titles' | 'youngestrounds' | 'oldestrounds'>('main');
  type PercentageSubTabState = 'overall' | 'per-round';
  type PercentageSubTabProp = 'overall' | 'rounds';

  const [activePercentageSubTab, setActivePercentageSubTab] = useState<PercentageSubTabState>('overall');

  const percentageActiveSubTab: PercentageSubTabProp = activePercentageSubTab === 'per-round' ? 'rounds' : 'overall';

  const [tabsInitialized, setTabsInitialized] = useState(false); // <-- evita risincronizzazione continua

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

  // Leggi tab iniziale solo una volta dai query params
  useEffect(() => {
    if (!tabsInitialized) {
      const tab = searchParams.get("tab");
      if (tab) setActiveTab(tab);
      setTabsInitialized(true);
    }
  }, [searchParams, tabsInitialized]);

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
        setActiveTab={setActiveTab}
        activeAgeSubTab={activeAgeSubTab}
        setActiveAgeSubTab={setActiveAgeSubTab}
        activePercentageSubTab={activePercentageSubTab}
        setActivePercentageSubTab={setActivePercentageSubTab}
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
