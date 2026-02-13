import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import CounterSeasons from './CounterSeasons'
import { metadataBase } from '../../../lib/site'
import { isRecordsSsrPrefetchEnabled } from '../../../lib/recordsSsrPrefetch'

type SearchParams = Record<string, string | string[] | undefined>

export default async function CounterSeasonsServer({ searchParams, ...serverProps }: { searchParams: SearchParams; [k: string]: any }) {
  const sp = (searchParams && typeof (searchParams as any).then === 'function') ? await (searchParams as any) : searchParams
  const toArray = (v?: string | string[]) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]))
  const getFirst = (k: string) => {
    const v = sp[k] ?? sp[`${k}[]`]
    return Array.isArray(v) ? v[0] : v
  }

  const selectedSurfaces = new Set(toArray(sp.surface ?? sp['surface[]']))
  const selectedLevels = new Set(toArray(sp.level ?? sp['level[]']))
  const selectedRounds = (getFirst('round') ?? '') as string
  const selectedBestOf = (() => {
    const v = getFirst('bestOf') ?? getFirst('best_of')
    if (!v) return null
    const parsed = Number(v)
    return Number.isFinite(parsed) ? parsed : null
  })()

  const seasonsParam = getFirst('seasons')
  const nParam = getFirst('n')
  const initialSeasons = (() => {
    const val = seasonsParam ?? nParam
    if (!val) return 1
    const parsed = Number(val)
    return Number.isFinite(parsed) ? parsed : 1
  })()

  const activeSubTabRaw = serverProps.sub ?? getFirst('subtab') ?? 'titles'
  const activeSubTab = activeSubTabRaw === 'rounds' ? 'round' : activeSubTabRaw

  const hasFilters =
    selectedSurfaces.size > 0 ||
    selectedLevels.size > 0 ||
    !!selectedRounds ||
    selectedBestOf !== null ||
    seasonsParam !== undefined

  const prefetchEnabled = isRecordsSsrPrefetchEnabled()
  // Prefetch counterseasons results with selected filters so SSR includes filtered table
  const prefetchedData: Record<string, any[] | undefined> = {}
  let description: string | undefined = undefined;
  if (prefetchEnabled) {
    try {
    const fetchJson = async (path: string) => {
      const url = new URL(path, metadataBase)
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) return undefined
      const json = await res.json()
      const arr = Array.isArray(json?.players) ? json.players : Array.isArray(json) ? json : undefined
      return arr
    }

    const params = new URLSearchParams()
    params.set('limit', '10')
    for (const s of Array.from(selectedSurfaces)) params.append('surface', s)
    for (const l of Array.from(selectedLevels)) params.append('level', l)
    if (selectedBestOf !== null) params.set('best_of', String(selectedBestOf))

    if (activeSubTab === 'titles') {
      params.set('minTitlesPerSeason', initialSeasons.toString())
      prefetchedData.titles = await fetchJson(`/api/records/counterseasons/titles${params.toString() ? '?' + params.toString() : ''}`)
    }
    if (activeSubTab === 'round') {
      params.set('round', selectedRounds || 'F')
      params.set('min', initialSeasons.toString())
      prefetchedData.rounds = await fetchJson(`/api/records/counterseasons/rounds${params.toString() ? '?' + params.toString() : ''}`)
    }
      if (activeSubTab === 'wins') {
        if (selectedRounds) params.set('round', selectedRounds);
        params.set('minWinsPerSeason', initialSeasons.toString())
        prefetchedData.wins = await fetchJson(`/api/records/counterseasons/wins${params.toString() ? '?' + params.toString() : ''}`)
      }

      // Build a server-side description for wins so SSR H1 reflects selected filters and initial number
      if (activeSubTab === 'wins') {
        const parts: string[] = [];
        const levelNames: Record<string, string> = { G: "Grand Slam", M: "Masters 1000", F: "ATP Finals", 500: "500", 250: "250", A: "Others", D: "Davis Cup" };
        const roundNames: Record<string, string> = { R128: "R128s", R64: "R64s", R32: "R32s", R16: "R16s", QF: "QFs", SF: "SFs", F: "Fs" };
        if (selectedLevels.size > 0) parts.push(`in ${Array.from(selectedLevels).map(l => levelNames[l] || l).join(' or ')}`);
        if (selectedSurfaces.size > 0) parts.push(`on ${Array.from(selectedSurfaces).join(' or ')}`);
        if (selectedRounds) {
          const roundNamesMap: Record<string, string> = { R128: "Round of 128", R64: "Round of 64", R32: "Round of 32", R16: "Round of 16", QF: "Quarterfinals", SF: "Semifinals", F: "Finals" };
          const raw = roundNamesMap[selectedRounds] ?? selectedRounds;
          const roundLabel = raw.endsWith('s') ? raw : `${raw}s`;
          parts.push(`in ${roundLabel}`);
        }
        const filtersText = parts.length ? ' ' + parts.join(' ') : '';
        const noun = Number(initialSeasons) === 1 ? 'win' : 'wins';
        description = `Seasons with at least ${initialSeasons} ${noun}${filtersText}`;
      }
    } catch (err) {
      // best-effort prefetch
    }
  }

  const fetchEnabled = serverProps.fetchEnabled ?? !prefetchEnabled
  const fetchRequestId = serverProps.fetchRequestId ?? (fetchEnabled ? String(Date.now()) : null)

  return (
    <ServerWrapper
      Component={CounterSeasons}
      searchParams={sp}
      serverProps={{
        ...serverProps,
        selectedSurfaces,
        selectedLevels,
        selectedRounds,
        selectedBestOf,
        activeSubTab,
        fetchEnabled,
        fetchRequestId,
        prefetchedData,
        initialSeasons,
        description: (typeof serverProps.description === 'string' && serverProps.description.trim() ? serverProps.description : description),
      }}
    />
  )
}
