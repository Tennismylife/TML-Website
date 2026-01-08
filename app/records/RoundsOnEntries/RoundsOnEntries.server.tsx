import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import RoundsOnEntries from './RoundsOnEntries'
import { metadataBase } from '../../../lib/site'

type SearchParams = Record<string, string | string[] | undefined>

export default async function RoundsOnEntriesServer({ searchParams, ...serverProps }: { searchParams: SearchParams; [k: string]: any }) {
  const sp = (searchParams && typeof (searchParams as any).then === 'function') ? await (searchParams as any) : searchParams
  const toArray = (v?: string | string[]) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]))
  const getFirst = (k: string) => {
    const v = sp[k] ?? sp[`${k}[]`]
    return Array.isArray(v) ? v[0] : v
  }

  const selectedSurfaces = new Set(toArray(sp.surface ?? sp['surface[]']))
  const selectedLevels = new Set(toArray(sp.level ?? sp['level[]']))
  const selectedRounds = serverProps.selectedRounds ?? (getFirst('round') ?? '')
  const activeSubTab = serverProps.sub ?? getFirst('subtab') ?? 'titles'

  const hasFilters = (() => {
    if (activeSubTab === 'round') {
      // A round value alone should trigger fetch; surfaces/levels are optional filters
      return selectedRounds ? true : false
    }
    return (selectedSurfaces.size > 0) || (selectedLevels.size > 0)
  })()

  const prefetchedData: Record<string, any[] | undefined> = {}
  if (!hasFilters) {
    try {
      if (activeSubTab === 'titles') {
        const params = new URLSearchParams()
        params.set('limit', '1000')
        const apiUrl = new URL(`/api/records/roundsonentries/titles?${params.toString()}`, metadataBase).toString()
        const res = await fetch(apiUrl, { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json()
          if (Array.isArray((json as any).FinalWins)) prefetchedData.titles = (json as any).FinalWins
        }
      } else if (activeSubTab === 'round' && selectedRounds) {
        const params = new URLSearchParams()
        params.set('limit', '1000')
        params.set('round', selectedRounds)
        const apiUrl = new URL(`/api/records/roundsonentries/rounds?${params.toString()}`, metadataBase).toString()
        const res = await fetch(apiUrl, { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json()
          if (Array.isArray((json as any).FinalWins)) prefetchedData.round = (json as any).FinalWins
        }
      }
    } catch (err) {
      // ignore prefetch failures
    }
  }

  const fetchEnabled = serverProps.fetchEnabled ?? hasFilters
  const fetchRequestId = serverProps.fetchRequestId ?? (fetchEnabled ? String(Date.now()) : null)

  return (
    <ServerWrapper
      Component={RoundsOnEntries}
      searchParams={sp}
      serverProps={{ selectedSurfaces, selectedLevels, selectedRounds, activeSubTab, fetchEnabled, fetchRequestId, prefetchedData, ...serverProps }}
    />
  )
}
