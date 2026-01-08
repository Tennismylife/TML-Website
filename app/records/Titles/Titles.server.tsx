import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import Titles from './Titles'
import { metadataBase } from '../../../lib/site'

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

  const hasFilters = (selectedSurfaces.size > 0) || (selectedLevels.size > 0)
  let topTitles: any[] = []

  if (!hasFilters) {
    try {
      const params = new URLSearchParams()
      params.set('perPage', '1000')
      const apiUrl = new URL(`/api/records/titles?${params.toString()}`, metadataBase).toString()
      const res = await fetch(apiUrl, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray((data as any).topTitles)) topTitles = (data as any).topTitles
      }
    } catch (err) {
      // ignore
    }
  }

  const fetchEnabled = hasFilters ? true : false

  return (
    <ServerWrapper
      Component={Titles}
      searchParams={sp}
      serverProps={( { ...(serverProps || {}), selectedSurfaces, selectedLevels, fetchEnabled, topTitles } as any)}
    />
  )
}
