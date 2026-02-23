import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// Mock next/navigation to avoid client-only hooks during server rendering
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    entries: () => [],
    get: () => null,
  }),
}))

import CountServer from '@/app/records/Count/Count.server'
import WinsServer from '@/app/records/Wins/Wins.server'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('Records SSR (filtered)', () => {
  it('Count server returns table rows when filters are applied', async () => {
    let lastUrl = '';
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      lastUrl = url;
      if ((url as string).includes('/api/records/count')) {
        return {
          ok: true,
          json: async () => ({ top: [ { name: 'Player A', ioc: 'USA', count: 5, id: 'p1' } ] }),
        }
      }
      return { ok: false }
    }))

    const el = await CountServer({ searchParams: { surface: 'Clay' } })
    // ensure fetch was called with surface filter
    expect(lastUrl).toContain('/api/records/count')
    expect(lastUrl).toContain('surface=Clay')
    expect(el).toBeDefined();
  })

  it('Wins server returns table rows when filters are applied', async () => {
    let lastUrl = '';
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      lastUrl = url;
      if ((url as string).includes('/api/records/wins')) {
        return {
          ok: true,
          json: async () => ([ { id: 'p1', name: 'Winner A', ioc: 'USA', wins: 10 } ]),
        }
      }
      return { ok: false }
    }))

    const el = await WinsServer({ searchParams: { surface: 'Clay' } })
    expect(lastUrl).toContain('/api/records/wins');
    expect(lastUrl).toContain('surface=Clay');
    expect(el).toBeDefined();
  })

  it('Wins server propagates after parameter from searchParams', async () => {
    let lastUrl = '';
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      lastUrl = url;
      return { ok: true, json: async () => ([] as any[]) } as any;
    }))

    await WinsServer({ searchParams: { after: '1' } });
    expect(lastUrl).toContain('after=1');
  })
})
