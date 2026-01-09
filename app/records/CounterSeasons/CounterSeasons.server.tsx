import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import CounterSeasons from './CounterSeasons'
import { metadataBase } from '../../../lib/site'

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

  const prefetchedData: Record<string, any[] | undefined> = {}
  if (!hasFilters) {
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
      params.set('limit', '1000')
      selectedSurfaces.forEach(s => params.append('surface', s))
      selectedLevels.forEach(l => params.append('level', l))
      if (selectedBestOf !== null) params.set('best_of', String(selectedBestOf))

      if (activeSubTab === 'titles') {
        params.set('minTitlesPerSeason', initialSeasons.toString())
        prefetchedData.titles = await fetchJson(`/api/records/counterseasons/titles?${params.toString()}`)
      }
      if (activeSubTab === 'round') {
        params.set('round', selectedRounds || 'F')
        params.set('min', initialSeasons.toString())
        prefetchedData.rounds = await fetchJson(`/api/records/counterseasons/rounds?${params.toString()}`)
      }
    } catch (err) {
      // best-effort prefetch
    }
  }

  const fetchEnabled = serverProps.fetchEnabled ?? hasFilters
  const fetchRequestId = serverProps.fetchRequestId ?? (fetchEnabled ? String(Date.now()) : null)

  return (
    <ServerWrapper
      Component={CounterSeasons}
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
        initialSeasons,
        ...serverProps,
      }}
    />
  )
}
