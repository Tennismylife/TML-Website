"use client"

import React, { useState } from 'react'
import FiltersComponent from './FiltersComponent'

interface Props {
  activeTab: string
  activeSubTab?: string | null
}

export default function FiltersClient({ activeTab, activeSubTab }: Props) {
  const [selectedSurfaces, setSelectedSurfaces] = useState<Set<string>>(new Set())
  const [selectedLevels, setSelectedLevels] = useState<Set<string>>(new Set())
  const [selectedRounds, setSelectedRounds] = useState<string>('')
  const [selectedBestOf, setSelectedBestOf] = useState<number | null>(null)

  return (
    <FiltersComponent
      selectedSurfaces={selectedSurfaces}
      setSelectedSurfaces={setSelectedSurfaces}
      selectedLevels={selectedLevels}
      setSelectedLevels={setSelectedLevels}
      selectedRounds={selectedRounds}
      setSelectedRounds={setSelectedRounds}
      selectedBestOf={selectedBestOf}
      setSelectedBestOf={setSelectedBestOf}
      activeTab={activeTab}
      activeSubTab={activeSubTab || undefined}
    />
  )
}
