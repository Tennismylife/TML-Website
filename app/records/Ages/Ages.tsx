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
}

export default function Ages({ selectedSurfaces, selectedLevels, selectedRounds, activeSubTab, fetchEnabled, fetchRequestId }: AgesProps) {
  switch (activeSubTab) {
    case "oldest": return <OldestMainDraw selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} fetchEnabled={fetchEnabled} fetchRequestId={fetchRequestId} />;
    case "youngest": return <YoungestMainDraw selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} fetchEnabled={fetchEnabled} fetchRequestId={fetchRequestId} />;
    case "oldestWinners": return <OldestWinners selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} fetchEnabled={fetchEnabled} fetchRequestId={fetchRequestId} />;
    case "youngestWinners": return <YoungestWinners selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} fetchEnabled={fetchEnabled} fetchRequestId={fetchRequestId} />;
    default: return null;
  }
} 
