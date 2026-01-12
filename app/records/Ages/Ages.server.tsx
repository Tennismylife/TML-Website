import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import Ages from './Ages'
import { metadataBase } from '../../../lib/site'

type SearchParams = Record<string, string | string[] | undefined>

export default async function AgesServer({ searchParams, ...serverProps }: { searchParams: SearchParams; [k: string]: any }) {
  const sp = (searchParams && typeof (searchParams as any).then === 'function') ? await (searchParams as any) : searchParams
  const toArray = (v?: string | string[]) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]))
  const getFirst = (k: string) => {
    const v = sp[k] ?? sp[`${k}[]`]
    return Array.isArray(v) ? v[0] : v
  }

  const selectedSurfaces = new Set(toArray(sp.surface ?? sp['surface[]']))
  const selectedLevels = new Set(toArray(sp.level ?? sp['level[]']))
  const selectedRounds = (getFirst('round') ?? '') as string
  const activeSubTab = serverProps.sub ?? getFirst('subtab') ?? 'oldest'

  const hasFilters = (selectedSurfaces.size > 0) || (selectedLevels.size > 0) || (selectedRounds ? true : false)

  // Prefetch ages data for the active subtab using selected filters so SSR includes the filtered table
  const prefetchedData: Record<string, any[] | undefined> = {}
  try {
    const params = new URLSearchParams()
    for (const s of Array.from(selectedSurfaces)) params.append('surface', s)
    for (const l of Array.from(selectedLevels)) params.append('level', l)
    params.set('limit', '1000')
    const type = activeSubTab?.toLowerCase().includes('youngest') ? 'youngest' : 'oldest'
    params.set('type', type)

    const isWinners = activeSubTab?.toLowerCase().includes('winner')
    const endpoint = isWinners ? '/api/records/ages/winners' : '/api/records/ages/maindraw'
    const apiUrl = new URL(`${endpoint}${params.toString() ? '?' + params.toString() : ''}`, metadataBase).toString()
    const res = await fetch(apiUrl, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      const key = isWinners ? (type === 'youngest' ? 'youngestWinners' : 'oldestWinners') : (type === 'youngest' ? 'youngestPlayers' : 'oldestPlayers')
      if (Array.isArray((data as any)[key])) prefetchedData[activeSubTab] = (data as any)[key]
    }
  } catch (err) {
    // ignore prefetch errors
  }

  const fetchEnabled = false
  const fetchRequestId = serverProps.fetchRequestId ?? null

  return (
    <ServerWrapper
      Component={Ages}
      searchParams={sp}
      serverProps={{ selectedSurfaces, selectedLevels, selectedRounds, activeSubTab, fetchEnabled, fetchRequestId, prefetchedData, ...serverProps }}
    />
  )
}
