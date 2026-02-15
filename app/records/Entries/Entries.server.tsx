import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import Entries from './Entries'
import { metadataBase } from '../../../lib/site'
import { isRecordsSsrPrefetchEnabled } from '../../../lib/recordsSsrPrefetch'
import { rateLimitedFetch } from '../../../lib/recordsPrefetchThrottle'

type SearchParams = Record<string, string | string[] | undefined>

export default async function EntriesServer({ searchParams, ...serverProps }: { searchParams: SearchParams; [k: string]: any }) {
  const sp = (searchParams && typeof (searchParams as any).then === 'function') ? await (searchParams as any) : searchParams
  const toArray = (v?: string | string[]) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]))
  const getFirst = (k: string) => {
    const v = sp[k] ?? sp[`${k}[]`]
    return Array.isArray(v) ? v[0] : v
  }

  const selectedSurfaces = new Set(toArray(sp.surface ?? sp['surface[]']))
  const selectedLevels = new Set(toArray(sp.level ?? sp['level[]']))

  const prefetchEnabled = isRecordsSsrPrefetchEnabled()
  // Prefetch results using selected filters so SSR shows filtered table
  let topEntries: any[] = []
  if (prefetchEnabled) {
    try {
      const params = new URLSearchParams()
      for (const s of Array.from(selectedSurfaces)) params.append('surface', s)
      for (const l of Array.from(selectedLevels)) params.append('level', l)
      params.set('perPage', '10')
      const apiUrl = new URL(`/api/records/entries${params.toString() ? '?' + params.toString() : ''}`, metadataBase).toString()
      const res = await rateLimitedFetch(apiUrl, { cache: 'force-cache' })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray((data as any).topEntries)) topEntries = (data as any).topEntries
      }
    } catch (err) {
      // ignore
    }
  }

  const fetchEnabled = serverProps.fetchEnabled ?? !prefetchEnabled

  return (
    <ServerWrapper
      Component={Entries}
      searchParams={sp}
      serverProps={{ selectedSurfaces, selectedLevels, fetchEnabled, topEntries, ...serverProps }}
    />
  )
}
