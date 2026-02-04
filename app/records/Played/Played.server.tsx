import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import Played from './Played'
import { metadataBase } from '../../../lib/site'
import { isRecordsSsrPrefetchEnabled } from '../../../lib/recordsSsrPrefetch'

type SearchParams = Record<string, string | string[] | undefined>

export default async function PlayedServer({ searchParams, ...serverProps }: { searchParams: SearchParams; [k: string]: any }) {
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
  // Server-side prefetch using selected filters so SSR includes filtered results
  let topPlayed: any[] = []
  if (prefetchEnabled) {
    try {
      const params = new URLSearchParams()
      for (const s of Array.from(selectedSurfaces)) params.append('surface', s)
      for (const l of Array.from(selectedLevels)) params.append('level', l)
      if (selectedRounds) params.set('round', selectedRounds)
      if (selectedBestOf) params.set('bestOf', String(selectedBestOf))
      params.set('perPage', '100')
      const apiUrl = new URL(`/api/records/played${params.toString() ? '?' + params.toString() : ''}`, metadataBase).toString()
      const res = await fetch(apiUrl, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) topPlayed = data
        else if (Array.isArray((data as any).players)) topPlayed = (data as any).players
        else if (Array.isArray((data as any).rows)) topPlayed = (data as any).rows
      }
    } catch (err) {
      // ignore - topPlayed stays empty
    }
  }

  // Prefetch performed: default to using server data on the client
  const fetchEnabled = serverProps.fetchEnabled ?? !prefetchEnabled

  // Always render through ServerWrapper so the client component handles pagination identically to Wins
  return (
    <ServerWrapper
      Component={Played}
      searchParams={sp}
      serverProps={{ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, fetchEnabled, topPlayed, ...serverProps } as any}
    />
  )
}
