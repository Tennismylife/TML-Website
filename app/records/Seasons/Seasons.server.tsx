import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import Seasons from './Seasons'
import { metadataBase } from '../../../lib/site'
import { isRecordsSsrPrefetchEnabled } from '../../../lib/recordsSsrPrefetch'
import { rateLimitedFetch } from '../../../lib/recordsPrefetchThrottle'

type SearchParams = Record<string, string | string[] | undefined>

export default async function SeasonsServer({ searchParams, ...serverProps }: { searchParams: SearchParams; [k: string]: any }) {
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
  // Prefetch seasons results with selected filters so SSR includes filtered table
  const prefetchedData: Record<string, any[] | undefined> = {}
  if (prefetchEnabled) {
    try {
    const params = new URLSearchParams()
    for (const s of Array.from(selectedSurfaces)) params.append('surface', s)
    // append both keys so downstream APIs that expect `level` _or_
    // `tourney_level` receive the filter during SSR prefetch
    for (const l of Array.from(selectedLevels)) { params.append('level', l); params.append('tourney_level', l); }
    if (selectedRounds) params.set('round', selectedRounds)
    if (selectedBestOf !== null) params.set('best_of', String(selectedBestOf))
    params.set('limit', '10')

    if (activeSubTab === 'wins') {
      const url = new URL(`/api/records/seasons/wins${params.toString() ? '?' + params.toString() : ''}`, metadataBase)
      const res = await rateLimitedFetch(url, { next: { tags: ['records'] } })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json)) prefetchedData.wins = json
      }
    }

    if (activeSubTab === 'played') {
      const url = new URL(`/api/records/seasons/played${params.toString() ? '?' + params.toString() : ''}`, metadataBase)
      const res = await rateLimitedFetch(url, { next: { tags: ['records'] } })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json)) prefetchedData.played = json
      }
    }

    if (activeSubTab === 'entries') {
      const url = new URL(`/api/records/seasons/entries${params.toString() ? '?' + params.toString() : ''}`, metadataBase)
      const res = await rateLimitedFetch(url, { next: { tags: ['records'] } })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json)) prefetchedData.entries = json
      }
    }

    if (activeSubTab === 'titles') {
      const url = new URL(`/api/records/seasons/titles${params.toString() ? '?' + params.toString() : ''}`, metadataBase)
      const res = await rateLimitedFetch(url, { next: { tags: ['records'] } })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json)) prefetchedData.titles = json
      }
    }

    if (activeSubTab === 'round' && selectedRounds) {
      params.set('round', selectedRounds)
      const url = new URL(`/api/records/seasons/rounds${params.toString() ? '?' + params.toString() : ''}`, metadataBase)
      const res = await rateLimitedFetch(url, { next: { tags: ['records'] } })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json)) prefetchedData.round = json
      }
    }

      if (activeSubTab === 'percentage') {
        const url = new URL(`/api/records/seasons/percentage${params.toString() ? '?' + params.toString() : ''}`, metadataBase)
        const res = await rateLimitedFetch(url, { next: { tags: ['records'] } })
        if (res.ok) {
          const json = await res.json()
          if (Array.isArray(json)) prefetchedData.percentage = json
        }
      }
    } catch (err) {
      // best-effort prefetch
    }
  }

  let fetchEnabled = serverProps.fetchEnabled ?? !prefetchEnabled
  // If SSR prefetching was attempted but produced no useful results for the
  // active subtab, allow the client to run its fetch so the page doesn't stay empty.
  if (prefetchEnabled) {
    const pref = (prefetchedData as any)?.[activeSubTab];
    if (!Array.isArray(pref) || pref.length === 0) fetchEnabled = true;
  }
  const fetchRequestId = serverProps.fetchRequestId ?? (fetchEnabled ? String(Date.now()) : null)

  // Debugging: log prefetch status for the `percentage` subtab in dev
  if (process.env.NODE_ENV !== 'production') {
    try {
      console.debug('[Seasons.server] activeSubTab=%s prefetchEnabled=%s prefetched.percentage=%s fetchEnabled=%s', activeSubTab, String(prefetchEnabled), Array.isArray(prefetchedData?.percentage) ? String(prefetchedData.percentage.length) : String(prefetchedData?.percentage), String(fetchEnabled));
    } catch (e) { /* ignore */ }
  }

  return (
    <ServerWrapper
      Component={Seasons}
      searchParams={sp}
      serverProps={{ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, activeSubTab, fetchEnabled, fetchRequestId, prefetchedData, ...serverProps }}
    />
  )
}
