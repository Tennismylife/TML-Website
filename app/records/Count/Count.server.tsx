import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import Count from './Count'
import { metadataBase } from '../../../lib/site'
import { isRecordsSsrPrefetchEnabled } from '../../../lib/recordsSsrPrefetch'
import { rateLimitedFetch } from '../../../lib/recordsPrefetchThrottle'

type SearchParams = Record<string, string | string[] | undefined>

export default async function CountServer({ searchParams, ...serverProps }: { searchParams: SearchParams; [k: string]: any }) {
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
    const v = getFirst('bestOf')
    return v ? Number(v) : null
  })()
  const hasFilters = (selectedSurfaces.size > 0) || (selectedLevels.size > 0) || (selectedRounds ? true : false) || (selectedBestOf ? true : false)

  const prefetchEnabled = isRecordsSsrPrefetchEnabled()
  // Prefetch count results with selected filters so SSR includes filtered table
  let topCount: any[] = []
  if (prefetchEnabled) {
    try {
      const params = new URLSearchParams()
      for (const s of Array.from(selectedSurfaces)) params.append('surface', s)
      for (const l of Array.from(selectedLevels)) params.append('level', l)
      if (selectedRounds) params.set('round', selectedRounds)
      if (selectedBestOf) params.set('bestOf', String(selectedBestOf))
      params.set('perPage', '10')
      const apiUrl = new URL(`/api/records/count${params.toString() ? '?' + params.toString() : ''}`, metadataBase).toString()
      const res = await rateLimitedFetch(apiUrl, { cache: 'force-cache' })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray((data as any).top)) topCount = (data as any).top
      }
    } catch (err) {
      // ignore
    }
  }

  const fetchEnabled = serverProps.fetchEnabled ?? !prefetchEnabled

  return (
    <ServerWrapper
      Component={Count}
      searchParams={sp}
      serverProps={{ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, fetchEnabled, topCount, ...serverProps }}
    />
  )
}
