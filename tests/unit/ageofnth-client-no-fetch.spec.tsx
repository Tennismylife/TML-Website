import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
/** @vitest-environment jsdom */
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest'

// Mock next/navigation used by the components
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: () => null, getAll: () => [], forEach: () => {}, has: () => false }),
}))

import WinsSection from '@/app/records/AgeofNth/WinsSection'
import PlayedSection from '@/app/records/AgeofNth/PlayedSection'

const sampleWin = { id: 'p1', name: 'Player One', ioc: 'USA', age_at_win: '20y 100d' }
const samplePlayed = { id: 'p2', name: 'Player Two', ioc: 'ESP', age_at_game: '21y 50d' }

describe('AgeofNth client components - no duplicate client fetch when prefetched', () => {
  let fetchSpy: any

  beforeEach(() => {
    fetchSpy = vi.fn()
    // @ts-ignore
    global.fetch = fetchSpy
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('WinsSection uses `initialData` and does not call fetch on mount when fetchEnabled=false', async () => {
    render(
      <WinsSection
        selectedSurfaces={[]}
        selectedLevels={[]}
        selectedRounds={''}
        selectedBestOf={null}
        fetchEnabled={false}
        setFetchEnabled={vi.fn()}
        fetchRequestId={null}
        description={''}
        initialData={[sampleWin as any]}
        initialNth={4}
      />
    )

    // initialData should be rendered in the table
    await waitFor(() => expect(screen.getByText(/Player One/i)).toBeTruthy())

    // no client fetch should have been performed
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('PlayedSection uses `initialData` and does not call fetch on mount when fetchEnabled=false', async () => {
    render(
      <PlayedSection
        selectedSurfaces={[]}
        selectedLevels={[]}
        selectedRounds={''}
        selectedBestOf={null}
        fetchEnabled={false}
        setFetchEnabled={vi.fn()}
        fetchRequestId={null}
        description={''}
        initialData={[samplePlayed as any]}
        initialNth={4}
      />
    )

    await waitFor(() => expect(screen.getByText(/Player Two/i)).toBeTruthy())
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('caps WinsSection client-side to first 100 results when API returns more', async () => {
    // prepare 200 mock players
    const big = Array.from({ length: 200 }, (_, i) => ({ id: `p${i}`, name: `Player ${i}`, ioc: 'USA', age_at_win: '20y 0d' }));
    const fetchSpy2 = vi.fn(async () => ({ ok: true, json: async () => big }));
    // @ts-ignore
    global.fetch = fetchSpy2

    render(
      <WinsSection
        selectedSurfaces={[]}
        selectedLevels={[]}
        selectedRounds={''}
        selectedBestOf={null}
        fetchEnabled={true}
        setFetchEnabled={vi.fn()}
        fetchRequestId={'r1'}
        description={''}
        initialData={[]}
        initialNth={4}
      />
    )

    // expect pagination to indicate 100 results => 5 pages (perPage=20)
    await waitFor(() => expect(screen.getByRole('button', { name: '5' })).toBeTruthy())
    expect(screen.queryByRole('button', { name: '10' })).toBeNull()
  })

  it('caps PlayedSection client-side to first 100 results when API returns more', async () => {
    const big = Array.from({ length: 200 }, (_, i) => ({ id: `p${i}`, name: `Player ${i}`, ioc: 'ESP', age_at_game: '21y 0d' }));
    const fetchSpy3 = vi.fn(async () => ({ ok: true, json: async () => big }));
    // @ts-ignore
    global.fetch = fetchSpy3

    render(
      <PlayedSection
        selectedSurfaces={[]}
        selectedLevels={[]}
        selectedRounds={''}
        selectedBestOf={null}
        fetchEnabled={true}
        setFetchEnabled={vi.fn()}
        fetchRequestId={'r2'}
        description={''}
        initialData={[]}
        initialNth={4}
      />
    )

    await waitFor(() => expect(screen.getByRole('button', { name: '5' })).toBeTruthy())
    expect(screen.queryByRole('button', { name: '10' })).toBeNull()
  })
})