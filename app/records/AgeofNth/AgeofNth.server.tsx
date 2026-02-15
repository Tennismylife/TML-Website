import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import AgeofNth from './AgeofNth'
import { metadataBase } from '../../../lib/site'
import { isRecordsSsrPrefetchEnabled } from '../../../lib/recordsSsrPrefetch'
import { rateLimitedFetch } from '../../../lib/recordsPrefetchThrottle'

type SearchParams = Record<string, string | string[] | undefined>

export default async function AgeofNthServer({ searchParams, ...serverProps }: { searchParams: SearchParams; [k: string]: any }) {
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
  const nthParam = (() => {
    const v = getFirst('n')
    if (!v) return null
    const parsed = Number(v)
    return Number.isFinite(parsed) ? parsed : null
  })()

  const activeSubTab = serverProps.sub ?? getFirst('subtab') ?? 'wins'
  const defaultNth = activeSubTab === 'round' ? 1 : 50
  const initialNth = Number.isFinite(nthParam) ? (nthParam as number) : defaultNth

  const hasFilters =
    selectedSurfaces.size > 0 ||
    selectedLevels.size > 0 ||
    !!selectedRounds ||
    selectedBestOf !== null ||
    nthParam !== null

  const prefetchEnabled = isRecordsSsrPrefetchEnabled()
  // Prefetch ageofnth data for the active subtab using selected filters so SSR includes filtered table
  const prefetchedData: Record<string, any[] | undefined> = {}
  if (prefetchEnabled) {
    try {
    const params = new URLSearchParams()
    params.set('limit', '10')
    // Use `n` for all AgeofNth endpoints (client and APIs expect `n`)
    params.set('n', initialNth.toString())

    for (const s of Array.from(selectedSurfaces)) params.append('surface', s)
    for (const l of Array.from(selectedLevels)) params.append('level', l)
    if (selectedRounds) params.set('round', selectedRounds)
    if (selectedBestOf !== null) params.set('best_of', String(selectedBestOf))

    const fetchJson = async (path: string) => {
      try {
        // If the path targets an internal ageofnth API, call the route handler
        // directly (server-side) to avoid making an HTTP request to our own
        // API endpoint — this prevents the server from logging an extra
        // /api/... HTTP call and removes the perceived double-render.
        if (path.startsWith('/api/records/ageofnth/')) {
          const endpoint = path.replace('/api/records/ageofnth/', '').split('?')[0];
          // dynamic import of the route module (wins, played, entries, titles, inslams, rounds)
          const mod = await import(`../../api/records/ageofnth/${endpoint}/route` as any);
          const fakeReq: any = { url: new URL(path, metadataBase).toString() };
          const res = await mod.GET(fakeReq as any);
          const json = await res.json();
          return Array.isArray(json) ? json : undefined;
        }

        const url = new URL(path, metadataBase)
        const res = await rateLimitedFetch(url, { cache: 'force-cache' })
        if (!res.ok) return undefined
        const json = await res.json()
        return Array.isArray(json) ? json : undefined
      } catch (err) {
        return undefined
      }
    }

    if (activeSubTab === 'wins') prefetchedData.wins = await fetchJson(`/api/records/ageofnth/wins${params.toString() ? '?' + params.toString() : ''}`)
    if (activeSubTab === 'played') prefetchedData.played = await fetchJson(`/api/records/ageofnth/played${params.toString() ? '?' + params.toString() : ''}`)
    if (activeSubTab === 'entries') prefetchedData.entries = await fetchJson(`/api/records/ageofnth/entries${params.toString() ? '?' + params.toString() : ''}`)
    if (activeSubTab === 'titles') prefetchedData.titles = await fetchJson(`/api/records/ageofnth/titles${params.toString() ? '?' + params.toString() : ''}`)
      if (activeSubTab === 'slams') prefetchedData.slams = await fetchJson(`/api/records/ageofnth/inslams${params.toString() ? '?' + params.toString() : ''}`)
      if (activeSubTab === 'round' && selectedRounds) prefetchedData.round = await fetchJson(`/api/records/ageofnth/rounds${params.toString() ? '?' + params.toString() : ''}`)
    } catch (err) {
      // best-effort prefetch
    }
  }

  let fetchEnabled = serverProps.fetchEnabled ?? !prefetchEnabled
  let fetchRequestId = serverProps.fetchRequestId ?? (fetchEnabled ? String(Date.now()) : null)

  // If server-side prefetch provided data for the active subtab, ensure the
  // client does not perform the same fetch again — disable client fetch and
  // clear the request id to prevent duplicate retrievals.
  if (prefetchEnabled && prefetchedData && activeSubTab && Array.isArray(prefetchedData[activeSubTab]) && (prefetchedData[activeSubTab] as any[]).length > 0) {
    fetchEnabled = false
    fetchRequestId = null
  }

  return (
    <ServerWrapper
      Component={AgeofNth}
      searchParams={sp}
      serverProps={{
        selectedSurfaces,
        selectedLevels,
        selectedRounds,
        selectedBestOf,
        activeSubTab,
        fetchEnabled,
        fetchRequestId,
        prefetchedData,
        initialNth,
        ...serverProps,
      }}
    />
  )
}
