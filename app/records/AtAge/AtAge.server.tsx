import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import AtAge from './AtAge'
import { metadataBase } from '../../../lib/site'

type SearchParams = Record<string, string | string[] | undefined>

export default async function AtAgeServer({ searchParams, ...serverProps }: { searchParams: SearchParams; [k: string]: any }) {
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
  const ageParam = getFirst('age')
  const initialAge = (() => {
    if (!ageParam) return 25
    const parsed = Number(ageParam)
    return Number.isFinite(parsed) ? parsed : 25
  })()
  const activeSubTab = serverProps.sub ?? getFirst('subtab') ?? 'wins'

  const hasFilters = selectedSurfaces.size > 0 || selectedLevels.size > 0 || !!selectedRounds || selectedBestOf !== null

  const prefetchedData: Record<string, any[] | undefined> = {}
  // Prefetch when either the age is explicitly provided in the URL (external entry)
  // or when there are no filters (the default behavior)
  if (ageParam || !hasFilters) {
    try {
      const params = new URLSearchParams()
      params.set('age', initialAge.toFixed(3))
      params.set('limit', '1000')
      selectedSurfaces.forEach(s => params.append('surface', s))
      selectedLevels.forEach(l => params.append('level', l))
      if (selectedRounds) params.set('round', selectedRounds)
      if (selectedBestOf !== null) params.set('best_of', String(selectedBestOf))

      const fetchJson = async (path: string) => {
        const url = new URL(path, metadataBase)
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) return undefined
        const json = await res.json()
        return Array.isArray(json) ? json : undefined
      }

      if (activeSubTab === 'wins') prefetchedData.wins = await fetchJson(`/api/records/atage/wins?${params.toString()}`)
      if (activeSubTab === 'played') prefetchedData.played = await fetchJson(`/api/records/atage/played?${params.toString()}`)
      if (activeSubTab === 'entries') prefetchedData.entries = await fetchJson(`/api/records/atage/entries?${params.toString()}`)
      if (activeSubTab === 'titles') prefetchedData.titles = await fetchJson(`/api/records/atage/titles?${params.toString()}`)
      if (activeSubTab === 'slams') prefetchedData.slams = await fetchJson(`/api/records/atage/inslams?${params.toString()}`)
      if (activeSubTab === 'round' && selectedRounds) prefetchedData.round = await fetchJson(`/api/records/atage/rounds?${params.toString()}`)
    } catch (err) {
      // best-effort prefetch
    }
  }

  const fetchEnabled = serverProps.fetchEnabled ?? hasFilters
  const fetchRequestId = serverProps.fetchRequestId ?? (fetchEnabled ? String(Date.now()) : null)

  return (
    <ServerWrapper
      Component={AtAge}
      searchParams={sp}
      serverProps={{ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, activeSubTab, fetchEnabled, fetchRequestId, prefetchedData, initialAge, ...serverProps }}
    />
  )
}
