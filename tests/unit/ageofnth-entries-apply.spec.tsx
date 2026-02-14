import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

/** @vitest-environment jsdom */

import EntriesSection from '@/app/records/AgeofNth/EntriesSection'

describe('AgeofNth Entries - Apply button updates data immediately', () => {
  let globalFetch: any

  beforeEach(() => {
    globalFetch = vi.spyOn(global, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('typing a new N then clicking Apply fetches on first click', async () => {
    const initial = [{ id: 'p1', name: 'Initial Player', ioc: 'ESP', age_at_entry: '22y 100d' }]
    const fetched = [{ id: 'p2', name: 'Nth Player', ioc: 'USA', age_at_entry: '20y 0d' }]

    globalFetch.mockImplementation(async (url: any) => {
      if (String(url).includes('n=4')) return { ok: true, json: async () => fetched } as any
      return { ok: true, json: async () => initial } as any
    })

    render(
      <EntriesSection
        selectedSurfaces={[]}
        selectedLevels={[]}
        fetchEnabled={false}
        setFetchEnabled={vi.fn()}
        fetchRequestId={null}
        description={''}
        initialData={initial}
        initialNth={2}
      />
    )

    // initial data must be visible
    expect(await screen.findByText('Initial Player')).toBeTruthy()

    // change nth input to 4
    const nthInput = screen.getByTestId('nth-input') as HTMLInputElement
    await userEvent.clear(nthInput)
    await userEvent.type(nthInput, '4')
    await waitFor(() => expect(nthInput).toHaveValue(4))

    // click Apply once
    const applyBtn = screen.getByRole('button', { name: /Apply/i })
    await userEvent.click(applyBtn)

    // should call fetch for n=4 and update the table
    await waitFor(() => expect(globalFetch).toHaveBeenCalled())
    const calls = globalFetch.mock.calls.map(c => String(c[0]))
    expect(calls.some(c => c.includes('/api/records/ageofnth/entries') && c.includes('n=4'))).toBeTruthy()
    await waitFor(() => expect(screen.queryByText('Initial Player')).toBeNull())
    expect(screen.getByText('Nth Player')).toBeTruthy()
  })

  it('includes level=G in API call when selectedLevels contains G and n=80', async () => {
    const fetched = [{ id: 'p2', name: 'Nth Player', ioc: 'USA', age_at_entry: '25y 0d' }]
    const fetchSpy = vi.fn(async (url: any) => {
      const s = String(url);
      if (s.includes('/api/records/ageofnth/entries') && s.includes('n=80') && s.includes('level=G')) {
        return { ok: true, json: async () => fetched } as any;
      }
      return { ok: true, json: async () => [] } as any;
    })
    // @ts-ignore
    global.fetch = fetchSpy

    render(
      <EntriesSection
        selectedSurfaces={[]}
        selectedLevels={['G']}
        fetchEnabled={true}
        setFetchEnabled={vi.fn()}
        fetchRequestId={'r1'}
        description={''}
        initialData={[]}
        initialNth={80}
      />
    )

    // expect fetch to be called with level=G and n=80
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    const calls = fetchSpy.mock.calls.map((c: any) => String(c[0]))
    expect(calls.some((c: string) => c.includes('/api/records/ageofnth/entries') && c.includes('n=80') && c.includes('level=G'))).toBeTruthy()

    // and the returned player should render
    await waitFor(() => expect(screen.getByText('Nth Player')).toBeTruthy())
  })
})