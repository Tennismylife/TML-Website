'use client';

import OldestMainDraw from "./OldestMainDraw";
import YoungestMainDraw from "./YoungestMainDraw";
import OldestWinners from "./OldestWinners";
import YoungestWinners from "./YoungestWinners";

interface AgesProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRounds: string;
  activeSubTab: string;
}

export default function Ages({ selectedSurfaces, selectedLevels, selectedRounds, activeSubTab }: AgesProps) {
  switch (activeSubTab) {
    case "oldest": return <OldestMainDraw selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} />;
    case "youngest": return <YoungestMainDraw selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} />;
    case "oldestWinners": return <OldestWinners selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} />;
    case "youngestWinners": return <YoungestWinners selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} />;
    default: return null;
  }
}
