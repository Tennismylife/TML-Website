import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import Count from './Count'
import { metadataBase } from '../../../lib/site'

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

  let topCount: any[] = []
  if (!hasFilters) {
    try {
      const params = new URLSearchParams()
      params.set('perPage', '1000')
      const apiUrl = new URL(`/api/records/count?${params.toString()}`, metadataBase).toString()
      const res = await fetch(apiUrl, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray((data as any).top)) topCount = (data as any).top
      }
    } catch (err) {
      // ignore
    }
  }

  const fetchEnabled = hasFilters ? true : false

  return (
    <ServerWrapper
      Component={Count}
      searchParams={sp}
      serverProps={{ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, fetchEnabled, topCount, ...serverProps }}
    />
  )
}
