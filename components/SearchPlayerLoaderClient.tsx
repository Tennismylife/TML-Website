'use client'

import dynamic from 'next/dynamic'
import React from 'react'

const SearchPlayerLoader = dynamic(() => import('./SearchPlayerLoader'), { ssr: false, loading: () => <div /> })

export default function SearchPlayerLoaderClient(props: any) {
  return <SearchPlayerLoader {...props} />
}
