'use client';

import OldestMainDraw from "./OldestMainDraw";
import YoungestMainDraw from "./YoungestMainDraw";
import OldestWinners from "./OldestWinners";
import YoungestWinners from "./YoungestWinners";

interface AgesProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  activeSubTab: string;
  fetchEnabled?: boolean;
  fetchRequestId?: string | null;
  description?: string;
}

export default function Ages({ selectedSurfaces, selectedLevels, selectedRounds, activeSubTab, fetchEnabled, fetchRequestId, description }: AgesProps) {
  switch (activeSubTab) {
    case "oldest": return <OldestMainDraw selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} fetchEnabled={fetchEnabled} fetchRequestId={fetchRequestId} description={description} />;
    case "youngest": return <YoungestMainDraw selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} fetchEnabled={fetchEnabled} fetchRequestId={fetchRequestId} description={description} />;
    case "oldestWinners": return <OldestWinners selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} fetchEnabled={fetchEnabled} fetchRequestId={fetchRequestId} description={description} />;
    case "youngestWinners": return <YoungestWinners selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} fetchEnabled={fetchEnabled} fetchRequestId={fetchRequestId} description={description} />;
    default: return null;
  }
} 
