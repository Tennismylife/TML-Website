import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import NeededTo from './NeededTo'
import { metadataBase } from '../../../lib/site'

type SearchParams = Record<string, string | string[] | undefined>

export default async function NeededToServer({ searchParams, ...serverProps }: { searchParams: SearchParams; [k: string]: any }) {
  const sp = (searchParams && typeof (searchParams as any).then === 'function') ? await (searchParams as any) : searchParams
  const toArray = (v?: string | string[]) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]))
  const getFirst = (k: string) => {
    const v = sp[k] ?? sp[`${k}[]`]
    return Array.isArray(v) ? v[0] : v
  }

  const selectedSurfaces = new Set(toArray(sp.surface ?? sp['surface[]']))
  const selectedLevels = new Set(toArray(sp.level ?? sp['level[]']))
  const selectedRounds = (getFirst('round') ?? '') as string
  const maxTitlesParam = getFirst('maxTitles')
  const roundNumberParam = getFirst('round_number')
  const nParam = getFirst('n')

  const parsedMaxTitles = (() => {
    const val = maxTitlesParam ?? nParam
    if (!val) return null
    const n = Number(val)
    return Number.isFinite(n) ? n : null
  })()

  const parsedRoundNumber = (() => {
    const val = roundNumberParam ?? nParam
    if (!val) return null
    const n = Number(val)
    return Number.isFinite(n) ? n : null
  })()

  const activeSubTab = serverProps.sub ?? getFirst('subtab') ?? 'titles'
  const initialNth = Number.isFinite(parsedMaxTitles) ? (parsedMaxTitles as number) : 1
  const initialRoundNumber = Number.isFinite(parsedRoundNumber) ? (parsedRoundNumber as number) : 1

  const hasFilters =
    selectedSurfaces.size > 0 ||
    selectedLevels.size > 0 ||
    !!selectedRounds ||
    parsedMaxTitles !== null ||
    parsedRoundNumber !== null

  const prefetchedData: Record<string, any[] | undefined> = {}
  if (!hasFilters) {
    try {
      const fetchJson = async (path: string) => {
        const url = new URL(path, metadataBase)
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) return undefined
        const json = await res.json()
        return Array.isArray(json) ? json : undefined
      }

      if (activeSubTab === 'titles') {
        const params = new URLSearchParams()
        params.set('limit', '1000')
        params.set('maxTitles', initialNth.toString())
        selectedSurfaces.forEach(s => params.append('surface', s))
        selectedLevels.forEach(l => params.append('level', l))
        prefetchedData.titles = await fetchJson(`/api/records/neededto/titles?${params.toString()}`)
      }

      if (activeSubTab === 'rounds') {
        const params = new URLSearchParams()
        params.set('limit', '1000')
        params.set('round_number', initialRoundNumber.toString())
        if (selectedRounds) params.set('round', selectedRounds)
        selectedSurfaces.forEach(s => params.append('surface', s))
        selectedLevels.forEach(l => params.append('level', l))
        prefetchedData.rounds = await fetchJson(`/api/records/neededto/rounds?${params.toString()}`)
      }
    } catch (err) {
      // best-effort prefetch
    }
  }

  const fetchEnabled = serverProps.fetchEnabled ?? hasFilters
  const fetchRequestId = serverProps.fetchRequestId ?? (fetchEnabled ? String(Date.now()) : null)

  return (
    <ServerWrapper
      Component={NeededTo}
      searchParams={sp}
      serverProps={{
        selectedSurfaces,
        selectedLevels,
        selectedRounds,
        activeSubTab,
        fetchEnabled,
        fetchRequestId,
        prefetchedData,
        initialNth,
        initialRoundNumber,
        ...serverProps,
      }}
    />
  )
}
