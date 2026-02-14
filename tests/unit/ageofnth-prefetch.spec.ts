import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import AgeofNthServer from '@/app/records/AgeofNth/AgeofNth.server'

describe('AgeofNth server prefetch', () => {
  let fetchSpy: any

  beforeEach(() => {
    process.env.RECORDS_SSR_PREFETCH = '1'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.RECORDS_SSR_PREFETCH
  })

  it('uses `n` in server prefetch for wins (no `x`)', async () => {
    const searchParams = { n: '70', subtab: 'wins' }

    // spy the wins route handler directly (server will call it internally)
    const winsRoute = await import('../../app/api/records/ageofnth/wins/route')
    const spy = vi.spyOn(winsRoute, 'GET').mockImplementation(async (req: any) => ({ ok: true, json: async () => [] } as any))

    // call the server component (it will attempt to prefetch)
    await AgeofNthServer({ searchParams } as any)

    expect(spy).toHaveBeenCalled()
    const calledArg = String(spy.mock.calls[0][0].url)
    expect(calledArg).toContain('/api/records/ageofnth/wins')
    expect(calledArg).toContain('n=70')
    expect(calledArg).not.toContain('x=')
  })

  it('passes level and n to entries route during server prefetch', async () => {
    const searchParams = { n: '80', subtab: 'entries', level: 'G' }

    // spy the entries route handler directly
    const entriesRoute = await import('../../app/api/records/ageofnth/entries/route')
    const spy = vi.spyOn(entriesRoute, 'GET').mockImplementation(async (req: any) => ({ ok: true, json: async () => [] } as any))

    await AgeofNthServer({ searchParams } as any)

    expect(spy).toHaveBeenCalled()
    const calledArg = String(spy.mock.calls[0][0].url)
    expect(calledArg).toContain('/api/records/ageofnth/entries')
    expect(calledArg).toContain('n=80')
    expect(calledArg).toContain('level=G')
  })
})