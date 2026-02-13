import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import Titles from './Titles'
import { metadataBase } from '../../../lib/site'
import { isRecordsSsrPrefetchEnabled } from '../../../lib/recordsSsrPrefetch'

type SearchParams = Record<string, string | string[] | undefined>

export default async function TitlesServer({ searchParams, ...serverProps }: { searchParams: SearchParams; [k: string]: any }) {
  const sp = (searchParams && typeof (searchParams as any).then === 'function') ? await (searchParams as any) : searchParams
  const toArray = (v?: string | string[]) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]))
  const getFirst = (k: string) => {
    const v = sp[k] ?? sp[`${k}[]`]
    return Array.isArray(v) ? v[0] : v
  }

  const selectedSurfaces = new Set(toArray(sp.surface ?? sp['surface[]']))
  const selectedLevels = new Set(toArray(sp.level ?? sp['level[]']))

  const prefetchEnabled = isRecordsSsrPrefetchEnabled()
  // Build params from selected filters and prefetch server-side so SSR includes filtered table
  let topTitles: any[] = []
  if (prefetchEnabled) {
    try {
      const params = new URLSearchParams()
      for (const s of Array.from(selectedSurfaces)) params.append('surface', s)
      for (const l of Array.from(selectedLevels)) params.append('level', l)
      params.set('perPage', '10')
      const apiUrl = new URL(`/api/records/titles${params.toString() ? '?' + params.toString() : ''}`, metadataBase).toString()
      const res = await fetch(apiUrl, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray((data as any).topTitles)) topTitles = (data as any).topTitles
      }
    } catch (err) {
      // ignore
    }
  }

  // Prefetched: client should use server data by default
  const fetchEnabled = serverProps.fetchEnabled ?? !prefetchEnabled

  return (
    <ServerWrapper
      Component={Titles}
      searchParams={sp}
      serverProps={( { ...(serverProps || {}), selectedSurfaces, selectedLevels, fetchEnabled, topTitles } as any)}
    />
  )
}
