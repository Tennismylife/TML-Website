import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import Streak from './Streak'
import { metadataBase } from '../../../lib/site'

type SearchParams = Record<string, string | string[] | undefined>

export default async function StreakServer({ searchParams, ...serverProps }: { searchParams: SearchParams; [k: string]: any }) {
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
  const activeSubTab = (serverProps.sub ?? getFirst('subtab') ?? 'wins') as string

  const hasFilters =
    selectedSurfaces.size > 0 ||
    selectedLevels.size > 0 ||
    !!selectedRounds ||
    selectedBestOf !== null

  const prefetchedData: Record<string, any[] | undefined> = {}
  if (!hasFilters) {
    const params = new URLSearchParams()
    params.set('limit', '100')
    selectedSurfaces.forEach(s => params.append('surface', s))
    selectedLevels.forEach(l => params.append('level', l))
    if (selectedRounds) params.set('round', selectedRounds)
    if (selectedBestOf !== null) params.set('best_of', String(selectedBestOf))

    const fetchJsonArray = async (path: string, key?: string) => {
      try {
        const url = new URL(path, metadataBase)
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) return undefined
        const json = await res.json()
        if (key) {
          const value = (json && typeof json === 'object') ? (json as any)[key] : undefined
          return Array.isArray(value) ? value : undefined
        }
        return Array.isArray(json) ? json : undefined
      } catch (err) {
        return undefined
      }
    }

    if (activeSubTab === 'wins') {
      prefetchedData.wins = await fetchJsonArray(`/api/records/streak/wins?${params.toString()}`, 'global')
    }
    if (activeSubTab === 'round') {
      prefetchedData.round = await fetchJsonArray(`/api/records/streak/rounds?${params.toString()}`, 'streaks')
    }
  }

  const fetchEnabled = serverProps.fetchEnabled ?? hasFilters
  const fetchRequestId = serverProps.fetchRequestId ?? (fetchEnabled ? String(Date.now()) : null)

  return (
    <ServerWrapper
      Component={Streak}
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
