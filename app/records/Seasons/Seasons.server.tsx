import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import Seasons from './Seasons'
import { metadataBase } from '../../../lib/site'

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

  // Prefetch seasons results with selected filters so SSR includes filtered table
  const prefetchedData: Record<string, any[] | undefined> = {}
  try {
    const params = new URLSearchParams()
    for (const s of Array.from(selectedSurfaces)) params.append('surface', s)
    for (const l of Array.from(selectedLevels)) params.append('level', l)
    if (selectedRounds) params.set('round', selectedRounds)
    if (selectedBestOf !== null) params.set('best_of', String(selectedBestOf))
    params.set('limit', '1000')

    if (activeSubTab === 'wins') {
      const url = new URL(`/api/records/seasons/wins${params.toString() ? '?' + params.toString() : ''}`, metadataBase)
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json)) prefetchedData.wins = json
      }
    }

    if (activeSubTab === 'played') {
      const url = new URL(`/api/records/seasons/played${params.toString() ? '?' + params.toString() : ''}`, metadataBase)
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json)) prefetchedData.played = json
      }
    }

    if (activeSubTab === 'entries') {
      const url = new URL(`/api/records/seasons/entries${params.toString() ? '?' + params.toString() : ''}`, metadataBase)
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json)) prefetchedData.entries = json
      }
    }

    if (activeSubTab === 'titles') {
      const url = new URL(`/api/records/seasons/titles${params.toString() ? '?' + params.toString() : ''}`, metadataBase)
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json)) prefetchedData.titles = json
      }
    }

    if (activeSubTab === 'round' && selectedRounds) {
      params.set('round', selectedRounds)
      const url = new URL(`/api/records/seasons/rounds${params.toString() ? '?' + params.toString() : ''}`, metadataBase)
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json)) prefetchedData.round = json
      }
    }

    if (activeSubTab === 'percentage') {
      const url = new URL(`/api/records/seasons/percentage${params.toString() ? '?' + params.toString() : ''}`, metadataBase)
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json)) prefetchedData.percentage = json
      }
    }
  } catch (err) {
    // best-effort prefetch
  }

  const fetchEnabled = serverProps.fetchEnabled ?? false
  const fetchRequestId = serverProps.fetchRequestId ?? (fetchEnabled ? String(Date.now()) : null)

  return (
    <ServerWrapper
      Component={Seasons}
      searchParams={sp}
      serverProps={{ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, activeSubTab, fetchEnabled, fetchRequestId, prefetchedData, ...serverProps }}
    />
  )
}
