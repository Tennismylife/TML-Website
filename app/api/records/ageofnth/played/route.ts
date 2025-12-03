import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)

    const selectedSurfaces = url.searchParams.getAll('surface').filter(Boolean)
    const selectedLevels   = url.searchParams.getAll('level').filter(Boolean)
    const selectedRounds   = url.searchParams.getAll('round').filter(Boolean)
    const selectedBestOf = url.searchParams
      .getAll('best_of')
      .map(b => Number(b))
      .filter(n => Number.isInteger(n))

    const filtersCount = [
      selectedSurfaces.length > 0,
      selectedLevels.length > 0,
      selectedRounds.length > 0,
      selectedBestOf.length > 0,
    ].filter(Boolean).length

    console.time('Total API')

    // =====================================================
    // CASE 1 → 0 o 1 filtro → usa la materialized view mv_played_ages
    // =====================================================
    if (filtersCount <= 1) {
      console.time('Use materialized view mv_played_ages')

      const data = await prisma.mVPlayedAges.findMany({
        select: {
          player_id: true,
          ages_json: true,
          ages_by_surface_json: true,
          ages_by_level_json: true,
          ages_by_round_json: true,
          ages_by_best_of_json: true,
        },
      })

      const players = await prisma.player.findMany({
        where: { id: { in: data.map(d => d.player_id) } },
        select: { id: true, player: true, ioc: true },
      })

      const result = players.map(p => {
        const mv = data.find(d => d.player_id === p.id)
        let selectedAges: Record<string, number> = (mv?.ages_json as Record<string, number>) ?? {}

        if (selectedSurfaces.length === 1)
          selectedAges = (mv?.ages_by_surface_json as Record<string, Record<string, number>>)?.[selectedSurfaces[0]] ?? {}
        else if (selectedLevels.length === 1)
          selectedAges = (mv?.ages_by_level_json as Record<string, Record<string, number>>)?.[selectedLevels[0]] ?? {}
        else if (selectedRounds.length === 1)
          selectedAges = (mv?.ages_by_round_json as Record<string, Record<string, number>>)?.[selectedRounds[0]] ?? {}
        else if (selectedBestOf.length === 1)
          selectedAges = (mv?.ages_by_best_of_json as Record<string, Record<string, number>>)?.[String(selectedBestOf[0])] ?? {}

        return {
          id: p.id,
          name: p.player,
          ioc: p.ioc || '',
          ages: { ages_json: selectedAges },
        }
      })

      console.timeEnd('Use materialized view mv_played_ages')
      console.timeEnd('Total API')
      return NextResponse.json(result)
    }

    // =====================================================
    // CASE 2 → 2 o più filtri → query dinamica completa
    // =====================================================
    console.time('Use dynamic filtered algorithm')

    const where = {
      status: true as const,
      ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
      ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
      ...(selectedRounds.length > 0 && { round: { in: selectedRounds } }),
      ...(selectedBestOf.length > 0 && { best_of: { in: selectedBestOf } }),
    }

    const matches = await prisma.match.findMany({
      where,
      select: {
        winner_id: true,
        loser_id: true,
        winner_age: true,
        loser_age: true,
      },
    })

    const ageMap = new Map<string, number[]>()

    for (const m of matches) {
      if (m.winner_id && m.winner_age != null) {
        const age = Number(m.winner_age)
        if (Number.isFinite(age)) {
          const arr = ageMap.get(m.winner_id) ?? []
          arr.push(age)
          ageMap.set(m.winner_id, arr)
        }
      }

      if (m.loser_id && m.loser_age != null) {
        const age = Number(m.loser_age)
        if (Number.isFinite(age)) {
          const arr = ageMap.get(m.loser_id) ?? []
          arr.push(age)
          ageMap.set(m.loser_id, arr)
        }
      }
    }

    // Costruisci cumulative JSON
    const cumulativeByPlayer = new Map<number, Record<string, number>>()

    for (const [playerId, arr] of ageMap.entries()) {
      const sorted = arr.sort((a, b) => a - b)
      const cumulative: Record<string, number> = {}
      let count = 0
      for (const age of sorted) {
        count++
        cumulative[age.toFixed(3)] = count
      }
      cumulativeByPlayer.set(Number(playerId), cumulative)
    }

    const playerIds = Array.from(ageMap.keys())
    const playersInfo = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, player: true, ioc: true },
    })

    const result = playersInfo.map(p => ({
      id: p.id,
      name: p.player,
      ioc: p.ioc || '',
      ages: { ages_json: cumulativeByPlayer.get(Number(p.id)) || {} },
    }))

    console.timeEnd('Use dynamic filtered algorithm')
    console.timeEnd('Total API')

    return NextResponse.json(result)

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
