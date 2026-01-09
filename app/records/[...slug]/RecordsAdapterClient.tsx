"use client";

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import RecordsFilteredClient from './RecordsFilteredClient';
import { usePathname, useRouter } from 'next/navigation';

// Import specific client record components (these are client components and will be hydrated)
const Wins = dynamic(() => import('../Wins/Wins'));
const Played = dynamic(() => import('../Played/Played'));
const Titles = dynamic(() => import('../Titles/Titles'));
const Entries = dynamic(() => import('../Entries/Entries'));
const Count = dynamic(() => import('../Count/Count'));
const Timespan = dynamic(() => import('../Timespan/Timespan'));
const Ages = dynamic(() => import('../Ages/Ages'));
const Percentage = dynamic(() => import('../Percentage/Percentage'));
const Roundsonentries = dynamic(() => import('../RoundsOnEntries/RoundsOnEntries'));
const Seasons = dynamic(() => import('../Seasons/Seasons'));
const Same = dynamic(() => import('../Same/Same'));
const AtAge = dynamic(() => import('../AtAge/AtAge'));
const AgeofNth = dynamic(() => import('../AgeofNth/AgeofNth'));
const NeededToSection = dynamic(() => import('../NeededTo/NeededTo'));
const CounterSeasonsSection = dynamic(() => import('../CounterSeasons/CounterSeasons'));
const H2HSection = dynamic(() => import('../H2H/H2H'));
const StreakSection = dynamic(() => import('../Streak/Streak'));

interface Filters {
  surface?: string[];
  level?: string[];
  round?: string | null;
  bestOf?: string | null;
}

interface Props {
  record?: string | null;
  sub?: string | null;
  filters?: Filters;
  topData?: any[] | null;
  canonicalUrl?: string;
  description?: string;
}

export default function RecordsAdapterClient({ record, sub, filters = {}, topData, canonicalUrl, description }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [syncing, setSyncing] = useState(false);

  // Build a URLSearchParams from filters
  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.surface && filters.surface.length) filters.surface.forEach(s => p.append('surface', s));
    if (filters.level && filters.level.length) filters.level.forEach(l => p.append('level', l));
    if (filters.round) p.set('round', filters.round);
    if (filters.bestOf) p.set('bestOf', filters.bestOf);
    return p;
  }, [filters]);

  // Convenience conversions for components expecting Sets / numbers
  const selectedSurfaces = new Set(filters.surface || []);
  const selectedLevels = new Set(filters.level || []);
  const selectedRounds = filters.round || '';
  const selectedBestOf = filters.bestOf ? Number(filters.bestOf) : null;
  const fetchEnabled = Boolean(params.toString());

  // If a legacy 'subtab' query param is present (eg. /records/ages?subtab=oldestWinners),
  // normalize it and convert it to the canonical path `/records/<record>/<subtab>` client-side
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      const subParam = url.searchParams.get('subtab');
      if (!subParam || !record) return;

      const parts = window.location.pathname.split('/').filter(Boolean);
      const recordsIndex = parts.indexOf('records');
      const hasSubPath = recordsIndex >= 0 && parts.length > recordsIndex + 2;
      if (hasSubPath) return; // already canonical

      const normalizeSubtab = (s: string | null) => {
        if (!s) return s;
        if (s.includes('-')) return s;
        return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase();
      };
      const normalized = normalizeSubtab(subParam);

      // Remove only the 'subtab' param from the query string and preserve others
      url.searchParams.delete('subtab');
      const remaining = url.searchParams.toString();

      const newPath = `/records/${encodeURIComponent(record)}${normalized ? '/' + encodeURIComponent(normalized) : ''}${remaining ? '?' + remaining : ''}`;
      // Replace history so we don't trigger a full navigation
      try {
        router.replace(newPath);
      } catch (err) {
        try { window.history.replaceState(null, '', newPath); } catch {}
      }
    } catch (e) {
      // ignore malformed urls
    }
  }, [record, pathname, router]);

  // Synchronize search params in the URL without reloading the page (so client components using useSearchParams see them)
  useEffect(() => {
    if (!window) return;
    const desiredQS = params.toString();
    const currentQS = window.location.search.replace(/^\?/, '');
    if (desiredQS === currentQS) return; // already matching
    setSyncing(true);
    const newUrl = pathname + (desiredQS ? `?${desiredQS}` : '');
    // Replace history so we don't trigger server navigation
    try {
      router.replace(newUrl);
    } catch (err) {
      try {
        window.history.replaceState(null, '', newUrl);
      } catch {}
    } finally {
      // allow small delay for router to settle
      setTimeout(() => setSyncing(false), 20);
    }
  }, [params, pathname, router]);

  if (syncing) return <div className="text-gray-300">Loading…</div>;

  // Render the specialized component when possible, otherwise fall back to generic table client
  switch (record) {
    case 'wins':
      return <Wins topWinners={topData || []} fetchEnabled={fetchEnabled} description={description} />;
    case 'played':
      return <Played topPlayed={topData || []} fetchEnabled={fetchEnabled} description={description} />;
    case 'titles':
      return <Titles topTitles={topData || []} description={description} />;
    case 'entries':
      return <Entries fetchEnabled={fetchEnabled} description={description} />;
    case 'count':
      return <Count topCount={topData || []} selectedRounds={selectedRounds} description={description} />;
    case 'timespan':
      return <Timespan selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedTab={sub || 'entries'} fetchEnabled={fetchEnabled} description={description} />;
    case 'ages':
      return <Ages selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} activeSubTab={sub || undefined} fetchEnabled={fetchEnabled} description={description} />;
    case 'percentage':
      return <Percentage selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} fetchEnabled={fetchEnabled} description={description} />;
    case 'roundsonentries':
      return <Roundsonentries selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} activeSubTab={sub || undefined} fetchEnabled={fetchEnabled} description={description} />;
    case 'seasons':
      return <Seasons selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={sub || undefined} fetchEnabled={fetchEnabled} description={description} />;
    case 'same':
      return <Same selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={sub || undefined} fetchEnabled={fetchEnabled} setFetchEnabled={() => {}} description={description} />;
    case 'atage':
      return <AtAge selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={sub || undefined} fetchEnabled={fetchEnabled} description={description} />;
    case 'ageofnth':
      return <AgeofNth selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={sub || undefined} fetchEnabled={fetchEnabled} description={description} fetchRequestId={Date.now().toString()} />;
    case 'neededto':
      return <NeededToSection selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} activeSubTab={sub || undefined} fetchEnabled={fetchEnabled} description={description} />;
    case 'counterseasons':
      return <CounterSeasonsSection selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={sub || 'round'} fetchEnabled={fetchEnabled} description={description} />;
    case 'h2h':
      return <H2HSection selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={sub || undefined} fetchEnabled={fetchEnabled} description={description} />;
    case 'streak':
      return <StreakSection selectedSurfaces={selectedSurfaces} selectedLevels={selectedLevels} selectedRounds={selectedRounds} selectedBestOf={selectedBestOf} activeSubTab={sub || undefined} fetchEnabled={fetchEnabled} description={description} />;
    default:
      // Generic client that fetches and renders a table for unknown or complex record types
      return <RecordsFilteredClient record={record ?? ''} sub={sub} filters={Object.fromEntries(params.entries())} canonicalUrl={canonicalUrl} />;
  }
}
