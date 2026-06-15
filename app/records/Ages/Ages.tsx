'use client';

import OldestMainDraw from "./OldestMainDraw";
import YoungestMainDraw from "./YoungestMainDraw";
import OldestWinners from "./OldestWinners";
import YoungestWinners from "./YoungestWinners";

interface AgesProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  activeSubTab?: string;
  fetchEnabled?: boolean;
  fetchRequestId?: string | null;
  description?: string;
  prefetchedData?: Record<string, any[] | undefined>;
}

export default function Ages({ selectedSurfaces, selectedLevels, selectedRounds, activeSubTab, fetchEnabled, fetchRequestId, description, prefetchedData }: AgesProps) {
  const subTab = activeSubTab || "oldest";

  switch (subTab) {
    case "oldest":
      return (
        <OldestMainDraw
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          selectedRounds={selectedRounds}
          fetchEnabled={fetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.["oldest"] as any[]}
        />
      );
    case "youngest":
      return (
        <YoungestMainDraw
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          selectedRounds={selectedRounds}
          fetchEnabled={fetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.["youngest"] as any[]}
        />
      );
    case "oldest-winners":
    case "oldestWinners":
      return (
        <OldestWinners
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          fetchEnabled={fetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.["oldestWinners"] as any[]}
        />
      );
    case "youngest-winners":
    case "youngestWinners":
      return (
        <YoungestWinners
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          fetchEnabled={fetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.["youngestWinners"] as any[]}
        />
      );
    default:
      return null;
  }
} 
