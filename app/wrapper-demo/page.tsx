import React from 'react'
import ServerWrapper from '../../components/ServerWrapper'
import LatestMatchesClient from '../../components/LatestMatchesClient'

export default function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Wrapper Demo</h1>
      <p className="mb-4">This page demonstrates rendering a client component via a server-side wrapper and passing URL search params to it.</p>
      <ServerWrapper Component={LatestMatchesClient} searchParams={searchParams} />
    </div>
  )
}
