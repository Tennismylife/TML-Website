import GamesLostSection from './GamesLostSection';
import MinutesSection from './MinutesSection';
import BreaksSection from './BreaksSection';
import SetsSection from './SetsSection';
import BreakPointsSection from './BreakPointsSection';
import { useState } from 'react';

interface LeastSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
}

export default function LeastSection({ selectedSurfaces, selectedLevels }: LeastSectionProps) {
  const [activeTab, setActiveTab] = useState<'gameslost' | 'minutes' | 'breaks' | 'sets' | 'breakpoints'>('gameslost');
  const [tabKey, setTabKey] = useState(0);

  const handleTabChange = (tab: 'gameslost' | 'minutes' | 'breaks' | 'sets' | 'breakpoints') => {
    setActiveTab(tab);
    setTabKey(prev => prev + 1); // Cambia la chiave per forzare il remount del componente e la chiamata API
  };

  return (
    <section className="rounded border bg-white p-4">
      <h2 className="text-lg font-bold mb-4">Least Records</h2>
      <div className="mb-4">
        <button
          onClick={() => handleTabChange('gameslost')}
          className={`px-4 py-2 mr-2 rounded ${activeTab === 'gameslost' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Games Lost
        </button>
        <button
          onClick={() => handleTabChange('minutes')}
          className={`px-4 py-2 mr-2 rounded ${activeTab === 'minutes' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Minutes
        </button>
        <button
          onClick={() => handleTabChange('breaks')}
          className={`px-4 py-2 mr-2 rounded ${activeTab === 'breaks' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Breaks Suffered
        </button>
        <button
          onClick={() => handleTabChange('sets')}
          className={`px-4 py-2 mr-2 rounded ${activeTab === 'sets' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Sets Lost
        </button>
        <button
          onClick={() => handleTabChange('breakpoints')}
          className={`px-4 py-2 rounded ${activeTab === 'breakpoints' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Break Points Faced
        </button>
      </div>
      {activeTab === 'gameslost' && (
        <GamesLostSection
          key={`gameslost-${tabKey}`}
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
        />
      )}
      {activeTab === 'minutes' && (
        <MinutesSection
          key={`minutes-${tabKey}`}
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
        />
      )}
      {activeTab === 'breaks' && (
        <BreaksSection
          key={`breaks-${tabKey}`}
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          selectedRounds={new Set()} // Assuming no rounds filter for now, or pass from parent if needed
        />
      )}
      {activeTab === 'sets' && (
        <SetsSection
          key={`sets-${tabKey}`}
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
        />
      )}
      {activeTab === 'breakpoints' && (
        <BreakPointsSection
          key={`breakpoints-${tabKey}`}
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          selectedRounds={new Set()} // Assuming no rounds filter for now, or pass from parent if needed
        />
      )}
    </section>
  );
}