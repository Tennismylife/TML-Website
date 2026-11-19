"use client";

import { useCallback } from "react";
import { useLinkTour } from "@/components/TourLink";
import { playerLevelName } from "./player-levels";

export function usePlayerLevel() {
  const tour = useLinkTour();
  return useCallback((level: string | null | undefined, atpName?: string) => playerLevelName(level, tour, atpName), [tour]);
}
