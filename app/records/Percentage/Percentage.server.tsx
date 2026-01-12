import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import Percentage from './Percentage'
import { metadataBase } from '../../../lib/site'

type SearchParams = Record<string, string | string[] | undefined>

export default async function PercentageServer({ searchParams, ...serverProps }: { searchParams: SearchParams; [k: string]: any }) {
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
    const v = getFirst('bestOf') ?? getFirst('best_of')
    return v ? Number(v) : null
  })()

  // Prefetch percentage results with selected filters so SSR includes filtered table
  let topWinPercentages: any[] = []
  try {
    const params = new URLSearchParams()
    for (const s of Array.from(selectedSurfaces)) params.append('surface', s)
    for (const l of Array.from(selectedLevels)) params.append('level', l)
    if (selectedRounds) params.set('round', selectedRounds)
    params.set('perPage', '1000')
    const apiUrl = new URL(`/api/records/percentage${params.toString() ? '?' + params.toString() : ''}`, metadataBase).toString()
    const res = await fetch(apiUrl, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray((data as any).rows)) topWinPercentages = (data as any).rows
    }
  } catch (err) {
    // ignore
  }

  const fetchEnabled = false

  return (
    <ServerWrapper
      Component={Percentage}
      searchParams={sp}
      serverProps={{ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, fetchEnabled, topWinPercentages, ...serverProps }}
    />
  )
}
