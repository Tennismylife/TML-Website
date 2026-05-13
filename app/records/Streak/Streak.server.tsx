import React from 'react'
import ServerWrapper from '../../../components/ServerWrapper'
import Streak from './Streak'
import { isRecordsSsrPrefetchEnabled } from '../../../lib/recordsSsrPrefetch'
import { prisma } from '../../../lib/prisma'

type SearchParams = Record<string, string | string[] | undefined>

export default async function StreakServer({ searchParams, ...serverProps }: { searchParams: SearchParams; [k: string]: any }) {
  const sp = (searchParams && typeof (searchParams as any).then === 'function') ? await (searchParams as any) : searchParams
  const toArray = (v?: string | string[]) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]))
  const getFirst = (k: string) => {
    const v = sp[k] ?? sp[`${k}[]`]
    return Array.isArray(v) ? v[0] : v
  }

  const selectedSurfaces = new Set(toArray(sp.surface ?? sp['surface[]']))
  const selectedLevels = new Set(toArray(sp.level ?? sp['level[]']))
  const selectedRounds = (getFirst('round') ?? '') as string
  const selectedBestOf = (() => {
    const v = getFirst('bestOf') ?? getFirst('best_of')
    if (!v) return null
    const parsed = Number(v)
    return Number.isFinite(parsed) ? parsed : null
  })()
  const activeSubTab = (serverProps.sub ?? getFirst('subtab') ?? 'wins') as string

  const prefetchEnabled = isRecordsSsrPrefetchEnabled()
  const prefetchedData: Record<string, any[] | undefined> = {}

  if (prefetchEnabled) {
    try {
      if (activeSubTab === 'wins') {
        const levels = Array.from(selectedLevels)
        const surfaces = Array.from(selectedSurfaces)
        const rounds = selectedRounds ? [selectedRounds] : []
        const bestOf = selectedBestOf !== null ? [selectedBestOf] : []
        const limit = 100
        const filtersCount = [levels, surfaces, rounds, bestOf].filter(a => a.length).length

        const enrichStreaks = async (streaks: any[]) => {
          if (!streaks.length) return []
          const playerIds = Array.from(new Set(streaks.map(s => s.player_id)))
          const players = await prisma.player.findMany({
            where: { id: { in: playerIds } },
            select: { id: true, atpname: true, ioc: true, slug: true },
          })
          const pm = Object.fromEntries(players.map(p => [p.id, p]))
          return streaks.map(s => ({
            ...s,
            player_name: pm[s.player_id]?.atpname || `Player ${s.player_id}`,
            player_ioc: pm[s.player_id]?.ioc || '',
            slug: pm[s.player_id]?.slug ?? null,
          }))
        }

        const mvData = await prisma.mvAllConsecutiveWinStreaks.findFirst()

        if (filtersCount === 0 && mvData?.global) {
          prefetchedData.wins = (await enrichStreaks(mvData.global as any[])).slice(0, limit)
        } else if (filtersCount === 1 && mvData) {
          let found = false
          if (levels.length && mvData.levels && (mvData.levels as any)[levels[0]]?.length) {
            prefetchedData.wins = (await enrichStreaks((mvData.levels as any)[levels[0]])).slice(0, limit)
            found = true
          } else if (surfaces.length && mvData.surfaces && (mvData.surfaces as any)[surfaces[0]]?.length) {
            prefetchedData.wins = (await enrichStreaks((mvData.surfaces as any)[surfaces[0]])).slice(0, limit)
            found = true
          } else if (bestOf.length && mvData.best_of && (mvData.best_of as any)[String(bestOf[0])]?.length) {
            prefetchedData.wins = (await enrichStreaks((mvData.best_of as any)[String(bestOf[0])])).slice(0, limit)
            found = true
          }
          if (!found) {
            // fallback live
            const matches = await prisma.match.findMany({
              where: { status: true, ...(levels.length && { tourney_level: { in: levels } }), ...(rounds.length && { round: { in: rounds } }) },
              orderBy: [{ tourney_date: 'asc' }, { id: 'asc' }],
              select: { id: true, winner_id: true, loser_id: true },
            })
            prefetchedData.wins = await enrichStreaks(
              (() => {
                const byP: Record<string, any[]> = {}
                for (const m of matches) {
                  if (m.winner_id) (byP[m.winner_id] ??= []).push({ win: 1, match_id: m.id })
                  if (m.loser_id) (byP[m.loser_id] ??= []).push({ win: 0, match_id: m.id })
                }
                const s: any[] = []
                for (const [pid, rs] of Object.entries(byP)) {
                  let cur: number[] = []
                  for (const r of rs) {
                    if (r.win) { cur.push(r.match_id) } else { if (cur.length) s.push({ player_id: pid, total_wins: cur.length, match_ids: [...cur] }); cur = [] }
                  }
                  if (cur.length) s.push({ player_id: pid, total_wins: cur.length, match_ids: [...cur] })
                }
                return s.sort((a, b) => b.total_wins - a.total_wins).slice(0, limit)
              })()
            )
          }
        } else {
          // 2+ filtri → live
          const matches = await prisma.match.findMany({
            where: {
              status: true,
              ...(levels.length && { tourney_level: { in: levels } }),
              ...(surfaces.length && { surface: { in: surfaces } }),
              ...(rounds.length && { round: { in: rounds } }),
              ...(bestOf.length && { best_of: { in: bestOf } }),
            },
            orderBy: [{ tourney_date: 'asc' }, { id: 'asc' }],
            select: { id: true, winner_id: true, loser_id: true },
          })
          prefetchedData.wins = await enrichStreaks(
            (() => {
              const byP: Record<string, any[]> = {}
              for (const m of matches) {
                if (m.winner_id) (byP[m.winner_id] ??= []).push({ win: 1, match_id: m.id })
                if (m.loser_id) (byP[m.loser_id] ??= []).push({ win: 0, match_id: m.id })
              }
              const s: any[] = []
              for (const [pid, rs] of Object.entries(byP)) {
                let cur: number[] = []
                for (const r of rs) {
                  if (r.win) { cur.push(r.match_id) } else { if (cur.length) s.push({ player_id: pid, total_wins: cur.length, match_ids: [...cur] }); cur = [] }
                }
                if (cur.length) s.push({ player_id: pid, total_wins: cur.length, match_ids: [...cur] })
              }
              return s.sort((a, b) => b.total_wins - a.total_wins).slice(0, limit)
            })()
          )
        }
      }
      if (activeSubTab === 'round') {
        // /streak/round usa fetch HTTP (API separata)
        const { rateLimitedFetch } = await import('../../../lib/recordsPrefetchThrottle')
        const { metadataBase } = await import('../../../lib/site')
        const params = new URLSearchParams()
        params.set('limit', '10')
        for (const s of Array.from(selectedSurfaces)) params.append('surface', s)
        for (const l of Array.from(selectedLevels)) params.append('level', l)
        if (selectedRounds) params.set('round', selectedRounds)
        if (selectedBestOf !== null) params.set('best_of', String(selectedBestOf))
        try {
          const url = new URL(`/api/records/streak/rounds${params.toString() ? '?' + params.toString() : ''}`, metadataBase)
          const res = await rateLimitedFetch(url, { next: { tags: ['records'] } })
          if (res.ok) {
            const json = await res.json()
            prefetchedData.round = Array.isArray(json?.streaks) ? json.streaks : undefined
          }
        } catch { /* ignore */ }
      }
    } catch (err) {
      // ignore — la pagina si caricherà comunque lato client
    }
  }

  const fetchEnabled = serverProps.fetchEnabled ?? !prefetchEnabled
  const fetchRequestId = serverProps.fetchRequestId ?? (fetchEnabled ? String(Date.now()) : null)

  return (
    <ServerWrapper
      Component={Streak}
      searchParams={sp}
      serverProps={{
        selectedSurfaces,
        selectedLevels,
        selectedRounds,
        selectedBestOf,
        activeSubTab,
        fetchEnabled,
        fetchRequestId,
        prefetchedData,
        ...serverProps,
      }}
    />
  )
}
