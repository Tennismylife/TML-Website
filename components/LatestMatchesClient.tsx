'use client'

import dynamic from 'next/dynamic'
import React from 'react'

const LatestMatches = dynamic(() => import('./LatestMatches'), { ssr: false, loading: () => <div /> })

export default function LatestMatchesClient(props: any) {
  return <LatestMatches {...props} />
}
