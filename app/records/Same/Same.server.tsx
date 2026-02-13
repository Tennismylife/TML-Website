import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import Same from './Same'
import { metadataBase } from '../../../lib/site'
import { isRecordsSsrPrefetchEnabled } from '../../../lib/recordsSsrPrefetch'

type SearchParams = Record<string, string | string[] | undefined>

export default async function SameServer({ searchParams, ...serverProps }: { searchParams: SearchParams; [k: string]: any }) {
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
    const raw = getFirst('best_of')
    if (!raw) return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  })()
  const activeSubTab = serverProps.sub ?? getFirst('subtab') ?? 'wins'

  const hasFilters = (() => {
    if (activeSubTab === 'round') return !!selectedRounds || selectedSurfaces.size > 0 || selectedLevels.size > 0
    return selectedSurfaces.size > 0 || selectedLevels.size > 0 || !!selectedRounds || selectedBestOf !== null
  })()

  const prefetchEnabled = isRecordsSsrPrefetchEnabled()
  // Prefetch Same results with selected filters so SSR includes filtered table
  const prefetchedData: Record<string, any[] | undefined> = {}
  if (prefetchEnabled) {
    try {
    const params = new URLSearchParams()
    for (const s of Array.from(selectedSurfaces)) params.append('surface', s)
    for (const l of Array.from(selectedLevels)) params.append('level', l)
    if (selectedRounds) params.set('round', selectedRounds)
    if (selectedBestOf !== null) params.set('best_of', String(selectedBestOf))
    params.set('limit', '10')

    // Helper to try metadataBase first, then localhost in development
    async function tryFetchPath(path: string) {
      try {
        const url = new URL(path, metadataBase).toString();
        let res = await fetch(url, { cache: 'no-store' })
        if (!res.ok && process.env.NODE_ENV !== 'production') {
          try {
            const devUrl = `http://localhost:${process.env.PORT ?? 3000}${path}`;
            res = await fetch(devUrl, { cache: 'no-store' })
          } catch (e) {
            // swallow
          }
        }
        return res
      } catch (e) {
        return null
      }
    }

    if (activeSubTab === 'wins') {
      const res = await tryFetchPath(`/api/records/same/wins${params.toString() ? '?' + params.toString() : ''}`)
      if (res && res.ok) {
        const json = await res.json()
        if (Array.isArray(json)) prefetchedData.wins = json
      }
    }

    if (activeSubTab === 'played') {
      const res = await tryFetchPath(`/api/records/same/played${params.toString() ? '?' + params.toString() : ''}`)
      if (res && res.ok) {
        const json = await res.json()
        if (Array.isArray(json)) prefetchedData.played = json
      }
    }

    if (activeSubTab === 'entries') {
      const res = await tryFetchPath(`/api/records/same/entries${params.toString() ? '?' + params.toString() : ''}`)
      if (res && res.ok) {
        const json = await res.json()
        if (Array.isArray(json)) prefetchedData.entries = json
      }
    }

    if (activeSubTab === 'titles') {
      const res = await tryFetchPath(`/api/records/same/titles${params.toString() ? '?' + params.toString() : ''}`)
      if (res && res.ok) {
        const json = await res.json()
        if (Array.isArray(json)) prefetchedData.titles = json
      }
    }

      if (activeSubTab === 'round' && selectedRounds) {
        params.set('round', selectedRounds)
        const res = await tryFetchPath(`/api/records/same/rounds${params.toString() ? '?' + params.toString() : ''}`)
        if (res && res.ok) {
          const json = await res.json()
          if (Array.isArray(json)) prefetchedData.round = json
        }
      }
    } catch (err) {
      // best-effort prefetch
    }
  }

  const fetchEnabled = serverProps.fetchEnabled ?? !prefetchEnabled
  const fetchRequestId = serverProps.fetchRequestId ?? (fetchEnabled ? String(Date.now()) : null)

  return (
    <ServerWrapper
      Component={Same}
      searchParams={sp}
      serverProps={{ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, activeSubTab, fetchEnabled, fetchRequestId, prefetchedData, ...serverProps }}
    />
  )
}
