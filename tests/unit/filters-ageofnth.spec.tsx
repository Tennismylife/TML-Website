import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
/** @vitest-environment jsdom */
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest'

// Mock next/navigation used by the components
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: () => null, getAll: () => [], forEach: () => {}, has: () => false }),
}))

import FiltersComponent from '@/app/records/FiltersComponent'
import WinsSection from '@/app/records/AgeofNth/WinsSection'

// Lightweight harness that wires Filters -> Wins the same way RecordsClient does
function Harness({ fetchSpy }: { fetchSpy: any }) {
  const [selectedSurfaces, setSelectedSurfacesState] = React.useState<Set<string>>(new Set())
  const [selectedLevels, setSelectedLevelsState] = React.useState<Set<string>>(new Set())
  const [selectedRounds, setSelectedRoundsState] = React.useState<string>('')
  const [selectedBestOf, setSelectedBestOfState] = React.useState<number | null>(null)

  const [fetchEnabled, setFetchEnabled] = React.useState(false)
  const [fetchRequestId, setFetchRequestId] = React.useState<string | null>(null)

  // wrapper like RecordsClient -- user actions set fetchRequestId + enable fetch
  const setSelectedSurfaces = (s: Set<string>) => { setSelectedSurfacesState(s); const id = 'r-test'; setFetchRequestId(id); setFetchEnabled(true); }
  const setSelectedLevels = (l: Set<string>) => { setSelectedLevelsState(l); const id = 'r-test'; setFetchRequestId(id); setFetchEnabled(true); }
  const setSelectedRoundsWrapper = (r: string) => { setSelectedRoundsState(r); const id = 'r-test'; setFetchRequestId(id); setFetchEnabled(true); }
  const setSelectedBestOfWrapper = (b: number | null) => { setSelectedBestOfState(b); const id = 'r-test'; setFetchRequestId(id); setFetchEnabled(true); }

  return (
    <div>
      <FiltersComponent
        selectedSurfaces={selectedSurfaces}
        setSelectedSurfaces={setSelectedSurfaces}
        selectedLevels={selectedLevels}
        setSelectedLevels={setSelectedLevels}
        selectedRounds={selectedRounds}
        setSelectedRounds={setSelectedRoundsWrapper}
        selectedBestOf={selectedBestOf}
        setSelectedBestOf={setSelectedBestOfWrapper}
        activeTab={'ageofnth'}
        activeSubTab={'wins'}
      />

      <WinsSection
        selectedSurfaces={Array.from(selectedSurfaces)}
        selectedLevels={Array.from(selectedLevels)}
        selectedRounds={selectedRounds}
        selectedBestOf={selectedBestOf}
        fetchEnabled={fetchEnabled}
        setFetchEnabled={() => setFetchEnabled(false)}
        fetchRequestId={fetchRequestId}
        description={''}
        initialData={[]}
        initialNth={4}
      />
    </div>
  )
}

describe('Filters → AgeofNth integration', () => {
  let fetchSpy: any

  beforeEach(() => {
    fetchSpy = vi.fn(async () => ({ ok: true, json: async () => [{ id: 'p1', name: 'Filter Player', ioc: 'USA', age_at_win: '22y 10d' }] }))
    // @ts-ignore
    global.fetch = fetchSpy
    // ensure clean location
    try { window.history.replaceState(null, '', '/records/ageofnth/wins'); } catch (e) {}
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('clicking a surface filter updates URL and triggers WinsSection fetch + render', async () => {
    render(<Harness fetchSpy={fetchSpy} />)

    // click the 'Hard' surface button
    const hardBtn = await screen.findByRole('button', { name: /Hard/i })
    fireEvent.click(hardBtn)

    // URL should be updated (history.replaceState is used by FiltersComponent)
    await waitFor(() => expect(window.location.search).toContain('surface=Hard'))

    // WinsSection should perform a client fetch and render the returned player
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText(/Filter Player/i)).toBeTruthy())
  })
})
