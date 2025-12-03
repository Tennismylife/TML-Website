import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)

    const selectedSurfaces = url.searchParams.getAll('surface').filter(Boolean)
    const selectedLevels = url.searchParams.getAll('level').filter(Boolean)
    const selectedRounds = url.searchParams.getAll('round').filter(Boolean)
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

    // =======================
    // CASO 1 → 0 o 1 filtro → usa MV
    // =======================
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

      const mvMap = new Map(data.map(d => [d.player_id, d]))

      const result = players.map(p => {
        const mv = mvMap.get(p.id)
        let ages = mv?.ages_json ?? {}

        if (selectedSurfaces.length === 1)
          ages = mv?.ages_by_surface_json?.[selectedSurfaces[0]] ?? {}
        else if (selectedLevels.length === 1)
          ages = mv?.ages_by_level_json?.[selectedLevels[0]] ?? {}
        else if (selectedRounds.length === 1)
          ages = mv?.ages_by_round_json?.[selectedRounds[0]] ?? {}
        else if (selectedBestOf.length === 1)
          ages = mv?.ages_by_best_of_json?.[selectedBestOf[0].toString()] ?? {}

        return {
          id: p.id,
          name: p.player,
          ioc: p.ioc || '',
          ages,
        }
      })

      console.timeEnd('Use materialized view mv_played_ages')
      console.timeEnd('Total API')
      return NextResponse.json(result)
    }

    // =======================
    // CASO 2 → 2 o più filtri → calcolo dinamico di un solo JSON cumulativo
    // =======================
    console.time('Use dynamic filtered algorithm')

    const where: any = { status: true }
    if (selectedSurfaces.length) where.surface = { in: selectedSurfaces }
    if (selectedLevels.length) where.tourney_level = { in: selectedLevels }
    if (selectedRounds.length) where.round = { in: selectedRounds }
    if (selectedBestOf.length) where.best_of = { in: selectedBestOf }

    const matches = await prisma.match.findMany({
      where,
      select: {
        winner_id: true,
        loser_id: true,
        winner_age: true,
        loser_age: true,
      },
    })

    // Mappa per accumulare età cumulativa totale per giocatore
    const ageMap = new Map<string, Record<string, number>>()

    for (const m of matches) {
      const rows = [
        { id: m.winner_id, age: m.winner_age },
        { id: m.loser_id, age: m.loser_age },
      ]

      for (const { id, age } of rows) {
        if (!id || age == null) continue
        const ageStr = age.toString()
        const obj = ageMap.get(id) ?? {}
        obj[ageStr] = (obj[ageStr] || 0) + 1
        ageMap.set(id, obj)
      }
    }

    // Funzione cumulativa ordinata
    function toCumulativeJSON(ageCounts: Record<string, number>) {
      const ages = Object.keys(ageCounts)
        .map(a => Number(a))
        .sort((a, b) => a - b)
      let cum = 0
      const res: Record<string, number> = {}
      for (const a of ages) {
        cum += ageCounts[a.toString()]
        res[a.toString()] = cum
      }
      return res
    }

    const playerIds = Array.from(ageMap.keys())
    const playersInfo = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, player: true, ioc: true },
    })

    const result = playersInfo.map(p => {
      const ages = ageMap.get(p.id)!
      return {
        id: p.id,
        name: p.player,
        ioc: p.ioc || '',
        ages: toCumulativeJSON(ages),
      }
    })

    console.timeEnd('Use dynamic filtered algorithm')
    console.timeEnd('Total API')

    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
