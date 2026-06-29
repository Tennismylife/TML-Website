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
  currentPath?: string;
}

export default function Ages({ selectedSurfaces, selectedLevels, selectedRounds, activeSubTab, fetchEnabled, fetchRequestId, description, prefetchedData, currentPath }: AgesProps) {
  const normalizeSubTab = (value?: string) => {
    if (!value) return "oldest";
    if (value === "oldestMainDraw") return "oldest";
    if (value === "youngestMainDraw") return "youngest";
    if (value === "oldestTitleWinners" || value === "oldestWinners") return "oldestWinners";
    if (value === "youngestTitleWinners" || value === "youngestWinners") return "youngestWinners";
    return value;
  };

  const subTab = normalizeSubTab(activeSubTab);

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
          currentPath={currentPath}
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
          currentPath={currentPath}
        />
      );
    case "oldest-winners":
    case "oldestWinners":
    case "oldestTitleWinners":
      return (
        <OldestWinners
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          fetchEnabled={fetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.["oldestWinners"] as any[]}
          currentPath={currentPath}
        />
      );
    case "youngest-winners":
    case "youngestWinners":
    case "youngestTitleWinners":
      return (
        <YoungestWinners
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          fetchEnabled={fetchEnabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.["youngestWinners"] as any[]}
          currentPath={currentPath}
        />
      );
    default:
      return null;
  }
} 
