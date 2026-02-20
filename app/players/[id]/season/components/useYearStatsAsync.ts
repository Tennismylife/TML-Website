/**
 * Async version of useYearStats.
 * Runs the heavy computation via requestIdleCallback so it never blocks
 * scroll or other user interactions on mobile.
 */

import { useEffect, useRef, useState } from "react";
import type { Match } from "@/types";
import { computeYearStats, emptyYearStats, type YearStatsResult } from "./computeYearStats";

export function useYearStatsAsync(
  allMatches: Match[],
  selectedYear: number,
  playerId: string,
  options?: {
    /** Pre-computed stats from SSR — skips client computation for this year */
    initialStatsForYear?: { stats: YearStatsResult; year: number } | null;
  }
): { stats: YearStatsResult; computing: boolean } {
  const initialSsr = options?.initialStatsForYear;
  const ssrMatchesYear = initialSsr?.year === selectedYear && initialSsr?.stats != null;

  const [stats,     setStats    ] = useState<YearStatsResult>(ssrMatchesYear ? initialSsr!.stats : emptyYearStats);
  const [computing, setComputing] = useState(false);

  // Track whether we've already served the SSR initial stats
  const ssrConsumedRef = useRef(ssrMatchesYear);

  // Refs to cancel the pending idle/timeout work on deps change
  const idleHandleRef    = useRef<number | null>(null);
  const timeoutHandleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable ref for the latest inputs so the scheduled callback always uses fresh values
  const inputRef = useRef({ allMatches, selectedYear, playerId });
  useEffect(() => {
    inputRef.current = { allMatches, selectedYear, playerId };
  }, [allMatches, selectedYear, playerId]);

  useEffect(() => {
    // If SSR stats are valid for this year and haven't been superseded by a year change, use them directly
    if (ssrConsumedRef.current && initialSsr?.year === selectedYear) {
      setStats(initialSsr!.stats);
      setComputing(false);
      return;
    }
    // After a year change invalidate the SSR cache
    ssrConsumedRef.current = false;

    if (!selectedYear || !allMatches.length) {
      setStats(emptyYearStats);
      setComputing(false);
      return;
    }

    // Cancel any previously scheduled (not yet started) computation
    if (idleHandleRef.current !== null) {
      if ("cancelIdleCallback" in window) {
        (window as any).cancelIdleCallback(idleHandleRef.current);
      }
      idleHandleRef.current = null;
    }
    if (timeoutHandleRef.current !== null) {
      clearTimeout(timeoutHandleRef.current);
      timeoutHandleRef.current = null;
    }

    setComputing(true);

    const run = () => {
      // Re-read from ref so we always compute with the most recent inputs
      const { allMatches: m, selectedYear: y, playerId: p } = inputRef.current;
      const result = computeYearStats(m, y, p);
      setStats(result);
      setComputing(false);
      idleHandleRef.current    = null;
      timeoutHandleRef.current = null;
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      // Run when the browser is truly idle (max 2 s wait so it doesn't starve too long)
      idleHandleRef.current = (window as any).requestIdleCallback(run, { timeout: 2000 });
    } else {
      // Fallback: next macrotask — still breaks the current synchronous render
      timeoutHandleRef.current = setTimeout(run, 0);
    }

    return () => {
      if (idleHandleRef.current !== null) {
        if ("cancelIdleCallback" in window) (window as any).cancelIdleCallback(idleHandleRef.current);
        idleHandleRef.current = null;
      }
      if (timeoutHandleRef.current !== null) {
        clearTimeout(timeoutHandleRef.current);
        timeoutHandleRef.current = null;
      }
    };
  }, [allMatches, selectedYear, playerId, initialSsr]); // eslint-disable-line react-hooks/exhaustive-deps

  return { stats, computing };
}
