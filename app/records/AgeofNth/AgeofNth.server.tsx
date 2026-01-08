import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import AgeofNth from './AgeofNth'
import { metadataBase } from '../../../lib/site'

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
    const v = getFirst('n') ?? getFirst('x')
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

  const prefetchedData: Record<string, any[] | undefined> = {}
  if (!hasFilters) {
    try {
      const params = new URLSearchParams()
      params.set('limit', '1000')
      params.set('n', initialNth.toString())
      params.set('x', initialNth.toString())
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

      if (activeSubTab === 'wins') prefetchedData.wins = await fetchJson(`/api/records/ageofnth/wins?${params.toString()}`)
      if (activeSubTab === 'played') prefetchedData.played = await fetchJson(`/api/records/ageofnth/played?${params.toString()}`)
      if (activeSubTab === 'entries') prefetchedData.entries = await fetchJson(`/api/records/ageofnth/entries?${params.toString()}`)
      if (activeSubTab === 'titles') prefetchedData.titles = await fetchJson(`/api/records/ageofnth/titles?${params.toString()}`)
      if (activeSubTab === 'slams') prefetchedData.slams = await fetchJson(`/api/records/ageofnth/inslams?${params.toString()}`)
      if (activeSubTab === 'round' && selectedRounds) prefetchedData.round = await fetchJson(`/api/records/ageofnth/rounds?${params.toString()}`)
    } catch (err) {
      // best-effort prefetch
    }
  }

  const fetchEnabled = serverProps.fetchEnabled ?? hasFilters
  const fetchRequestId = serverProps.fetchRequestId ?? (fetchEnabled ? String(Date.now()) : null)

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
