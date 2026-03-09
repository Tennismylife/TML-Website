import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import Wins from './Wins'
import { metadataBase } from '../../../lib/site'
import { isRecordsSsrPrefetchEnabled } from '../../../lib/recordsSsrPrefetch'
import { rateLimitedFetch } from '../../../lib/recordsPrefetchThrottle'

type SearchParams = Record<string, string | string[] | undefined>

export default async function WinsServer({ searchParams, ...serverProps }: { searchParams: SearchParams; [k: string]: any }) {
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
  const selectedTopN = (() => {
    const v = getFirst('top');
    return v ? Number(v) : null;
  })()
  const activeSubTab = serverProps.sub ?? getFirst('subtab') ?? undefined

  const prefetchEnabled = isRecordsSsrPrefetchEnabled()
  // Server-side prefetch of record data to ensure SSR includes results
  const params = new URLSearchParams()
  for (const s of Array.from(selectedSurfaces)) params.append('surface', s)
  for (const l of Array.from(selectedLevels)) params.append('level', l)
  if (selectedRounds) params.set('round', selectedRounds)
  if (selectedBestOf) params.set('bestOf', String(selectedBestOf))
  if (selectedTopN) params.set('top', String(selectedTopN))
  // propagate `after` boolean if provided in URL
  const afterParam = getFirst('after');
  if (afterParam) {
    const a = String(afterParam).toLowerCase();
    if (a === '1' || a === 'true' || a === 'yes') {
      params.set('after', '1');
    }
  }
  // request a small perPage for SSR prefetch (only top 10)
  params.set('perPage', '10')

  const apiUrl = new URL(`/api/records/wins${params.toString() ? '?' + params.toString() : ''}`, metadataBase).toString()
  let topWinners: any[] = []
  if (prefetchEnabled) {
    try {
      const res = await rateLimitedFetch(apiUrl, { next: { tags: ['records'] } })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) topWinners = data
        else if (Array.isArray((data as any).topWinners)) topWinners = (data as any).topWinners
        else if (Array.isArray((data as any).rows)) topWinners = (data as any).rows
      }
    } catch (err) {
      // ignore - topWinners stays empty
    }
  }

  // We pass topWinners to the client component, and set fetchEnabled=false so the client
  // does not immediately refetch the same data on mount. Interactions (filters/view-all)
  // can still trigger fetches later via UI controls.
  const fetchEnabled = serverProps.fetchEnabled ?? !prefetchEnabled

  return (
    <ServerWrapper
      Component={Wins}
      searchParams={sp}
      serverProps={{ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, selectedTopN, activeSubTab, fetchEnabled, topWinners, ...(serverProps as any) } as any}
    />
  )
}
