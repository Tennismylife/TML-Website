import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import Timespan from './Timespan'
import { metadataBase } from '../../../lib/site'
import { isRecordsSsrPrefetchEnabled } from '../../../lib/recordsSsrPrefetch'
import { rateLimitedFetch } from '../../../lib/recordsPrefetchThrottle'

type SearchParams = Record<string, string | string[] | undefined>

export default async function TimespanServer({ searchParams, ...serverProps }: { searchParams: SearchParams; [k: string]: any }) {
  const sp = (searchParams && typeof (searchParams as any).then === 'function') ? await (searchParams as any) : searchParams
  const toArray = (v?: string | string[]) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]))
  const getFirst = (k: string) => {
    const v = sp[k] ?? sp[`${k}[]`]
    return Array.isArray(v) ? v[0] : v
  }

  const selectedSurfaces = new Set(toArray(sp.surface ?? sp['surface[]']))
  const selectedLevels = new Set(toArray(sp.level ?? sp['level[]']))
  const selectedTab = serverProps.sub ?? getFirst('subtab') ?? 'entries'
  const rawRound = serverProps.selectedRounds ?? (getFirst('round') ?? '')
  const selectedRounds = (!rawRound && selectedTab === 'rounds') ? 'F' : rawRound

  const hasFilters = (() => {
    if (selectedTab === 'rounds') {
      return selectedRounds ? ((selectedSurfaces.size > 0) || (selectedLevels.size > 0)) : false
    }
    return (selectedSurfaces.size > 0) || (selectedLevels.size > 0)
  })()

  const prefetchEnabled = isRecordsSsrPrefetchEnabled()
  const prefetchedData: Record<string, any[] | undefined> = {}

  // Prefetch timespan data using selected filters so SSR includes filtered table
  if (prefetchEnabled) {
    try {
    const params = new URLSearchParams()
    for (const s of Array.from(selectedSurfaces)) params.append('surface', s)
    for (const l of Array.from(selectedLevels)) params.append('level', l)

    if (selectedTab === 'titles') {
      params.set('limit', '10')
      const apiUrl = new URL(`/api/records/timespan/titles${params.toString() ? '?' + params.toString() : ''}`, metadataBase).toString()
      const res = await rateLimitedFetch(apiUrl, { next: { tags: ['records'] } })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray((json as any).data)) prefetchedData[selectedTab] = (json as any).data
      }
    } else if (selectedTab === 'entries') {
      params.set('perPage', '10')
      const apiUrl = new URL(`/api/records/timespan/entries${params.toString() ? '?' + params.toString() : ''}`, metadataBase).toString()
      const res = await rateLimitedFetch(apiUrl, { next: { tags: ['records'] } })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json)) prefetchedData[selectedTab] = json as any[]
      }
      } else if (selectedTab === 'rounds' && selectedRounds) {
        params.set('round', selectedRounds)
        params.set('perPage', '10')
        const apiUrl = new URL(`/api/records/timespan/rounds${params.toString() ? '?' + params.toString() : ''}`, metadataBase).toString()
        const res = await rateLimitedFetch(apiUrl, { next: { tags: ['records'] } })
        if (res.ok) {
          const json = await res.json()
          if (Array.isArray((json as any).data)) prefetchedData[selectedTab] = (json as any).data
        }
      }
    } catch (err) {
      // ignore prefetch failures
    }
  }

  const fetchEnabled = serverProps.fetchEnabled ?? !prefetchEnabled
  const fetchRequestId = serverProps.fetchRequestId ?? (fetchEnabled ? String(Date.now()) : null)

  return (
    <ServerWrapper
      Component={Timespan}
      searchParams={sp}
      serverProps={{ selectedSurfaces, selectedLevels, selectedRounds, selectedTab, fetchEnabled, fetchRequestId, prefetchedData, ...serverProps }}
    />
  )
}
