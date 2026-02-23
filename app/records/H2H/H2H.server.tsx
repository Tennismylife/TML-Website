import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import H2H from './H2H'
import { metadataBase } from '../../../lib/site'
import { isRecordsSsrPrefetchEnabled } from '../../../lib/recordsSsrPrefetch'
import { rateLimitedFetch } from '../../../lib/recordsPrefetchThrottle'

type SearchParams = Record<string, string | string[] | undefined>

export default async function H2HServer({ searchParams, ...serverProps }: { searchParams: SearchParams; [k: string]: any }) {
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

  const activeSubTab = (serverProps.sub ?? getFirst('subtab') ?? 'count') as string

  const hasFilters =
    selectedSurfaces.size > 0 ||
    selectedLevels.size > 0 ||
    !!selectedRounds ||
    selectedBestOf !== null

  const prefetchEnabled = isRecordsSsrPrefetchEnabled()
  // Prefetch H2H data for the active subtab using selected filters so SSR includes filtered results
  const prefetchedData: Record<string, any[] | undefined> = {}
  if (prefetchEnabled) {
    try {
    const params = new URLSearchParams()
    for (const s of Array.from(selectedSurfaces)) params.append('surface', s)
    for (const l of Array.from(selectedLevels)) params.append('level', l)
    if (selectedRounds) params.set('round', selectedRounds)
    if (selectedBestOf !== null) params.set('best_of', String(selectedBestOf))
    // limit SSR prefetch to top 10
    params.set('limit', '10')

    const fetchArray = async (path: string, key: string) => {
      try {
        const url = new URL(path, metadataBase)
        const res = await rateLimitedFetch(url, { next: { tags: ['records'] } })
        if (!res.ok) return undefined
        const json = await res.json()
        const value = (json && typeof json === 'object') ? (json as any)[key] : undefined
        return Array.isArray(value) ? value : undefined
      } catch (err) {
        return undefined
      }
    }

    if (activeSubTab === 'count') {
      prefetchedData.count = await fetchArray(`/api/records/h2h/count${params.toString() ? '?' + params.toString() : ''}`, 'h2h')
    }
    if (activeSubTab === 'seasons') {
      prefetchedData.seasons = await fetchArray(`/api/records/h2h/seasons${params.toString() ? '?' + params.toString() : ''}`, 'h2h_season')
    }
    if (activeSubTab === 'tournament') {
      prefetchedData.tournament = await fetchArray(`/api/records/h2h/sametournament${params.toString() ? '?' + params.toString() : ''}`, 'h2h_tourney')
    }
      if (activeSubTab === 'timespan') {
        prefetchedData.timespan = await fetchArray(`/api/records/h2h/timespan${params.toString() ? '?' + params.toString() : ''}`, 'h2hTimespans')
      }
    } catch (err) {
      // ignore
    }
  }

  const fetchEnabled = serverProps.fetchEnabled ?? !prefetchEnabled
  const fetchRequestId = serverProps.fetchRequestId ?? (fetchEnabled ? String(Date.now()) : null)

  return (
    <ServerWrapper
      Component={H2H}
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
        ...serverProps,
      }}
    />
  )
}
