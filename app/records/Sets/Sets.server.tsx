import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import Sets from './Sets'

type SearchParams = Record<string, string | string[] | undefined>

export default async function SetsServer({ searchParams, ...serverProps }: { searchParams: SearchParams; [k: string]: any }) {
  const sp = (searchParams && typeof (searchParams as any).then === 'function') ? await (searchParams as any) : searchParams
  const toArray = (v?: string | string[]) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]))
  const getFirst = (k: string) => {
    const v = sp[k] ?? sp[`${k}[]`]
    return Array.isArray(v) ? v[0] : v
  }

  const selectedSurfaces = new Set(toArray(sp.surface ?? sp['surface[]']))
  const selectedLevels = new Set(toArray(sp.level ?? sp['level[]']))
  const fetchEnabled = serverProps.fetchEnabled ?? Object.keys(sp || {}).length > 0

  return (
    <ServerWrapper
      Component={Sets}
      searchParams={sp}
      serverProps={{ selectedSurfaces, selectedLevels, fetchEnabled, ...serverProps }}
    />
  )
}
