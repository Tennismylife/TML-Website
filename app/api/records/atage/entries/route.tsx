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

    const filtersCount = [
      selectedSurfaces.length > 0,
      selectedLevels.length > 0,
    ].filter(Boolean).length

    console.time('Total API')

    // =====================================================
    // CASE 1 → 0 o 1 filtro → usa la materialized view mv_player_entries
    // =====================================================
    if (filtersCount <= 1) {
      console.time('Use materialized view mv_player_entries')

      const data = await prisma.mVEntriesAges.findMany({
        select: {
          player_id: true,
          ages_json: true,
          ages_by_surface_json: true,
          ages_by_level_json: true,
        },
      })

      const players = await prisma.player.findMany({
        where: { id: { in: data.map(d => d.player_id) } },
        select: { id: true, player: true, ioc: true },
      })

      const result = players.map(p => {
        const mv = data.find(d => d.player_id === p.id)
        let entries = mv?.ages_json ?? {}

        if (selectedSurfaces.length === 1)
          entries = mv?.ages_by_surface_json?.[selectedSurfaces[0]] ?? {}
        else if (selectedLevels.length === 1)
          entries = mv?.ages_by_level_json?.[selectedLevels[0]] ?? {}

        return {
          id: p.id,
          name: p.player,
          ioc: p.ioc || '',
          entries,
        }
      })

      console.timeEnd('Use materialized view mv_player_entries')
      console.timeEnd('Total API')
      return NextResponse.json(result)
    }

    // =====================================================
    // CASE 2 → 2 o più filtri → query dinamica completa
    // =====================================================
    console.time('Use dynamic filtered algorithm')

    const where = {
      status: true as const,
      team_event: false,
      ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
      ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
    }

    console.time('FindMany matches (entries)')
    const matches = await prisma.match.findMany({
      where,
      select: {
        winner_id: true,
        loser_id: true,
        winner_age: true,
        loser_age: true,
        event_id: true, // serve per player_id-event_id unici
      },
    })
    console.timeEnd('FindMany matches (entries)')

    const tempAgeMap = new Map<string, number[]>()
    const ageMap = new Map<string, Record<number, number>>()
    const seenEntries = new Set<string>() // player_id-event_id unici

    for (const m of matches) {
      if (m.winner_id && m.winner_age != null) {
        const key = `${m.winner_id}-${m.event_id}`
        if (!seenEntries.has(key)) {
          const ageNum = Number(m.winner_age)
          if (Number.isFinite(ageNum)) {
            const arr = tempAgeMap.get(m.winner_id) ?? []
            arr.push(ageNum)
            tempAgeMap.set(m.winner_id, arr)
            seenEntries.add(key)
          }
        }
      }

      if (m.loser_id && m.loser_age != null) {
        const key = `${m.loser_id}-${m.event_id}`
        if (!seenEntries.has(key)) {
          const ageNum = Number(m.loser_age)
          if (Number.isFinite(ageNum)) {
            const arr = tempAgeMap.get(m.loser_id) ?? []
            arr.push(ageNum)
            tempAgeMap.set(m.loser_id, arr)
            seenEntries.add(key)
          }
        }
      }
    }

    // cumulativo per età, mantenendo l'associazione age → count
    for (const [id, arr] of tempAgeMap) {
      arr.sort((a, b) => a - b)
      const cumulative: Record<number, number> = {}
      let total = 0
      for (const age of arr) {
        total += 1
        cumulative[age] = total
      }
      ageMap.set(id, cumulative)
    }

    const playerIds = Array.from(ageMap.keys()).map(id => String(id))

    console.time('FindMany playersInfo')
    const playersInfo = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, player: true, ioc: true },
    })
    console.timeEnd('FindMany playersInfo')

    const result = playersInfo.map(p => ({
      id: p.id,
      name: p.player,
      ioc: p.ioc || '',
      entries: ageMap.get(String(p.id)) ?? {},
    }))

    console.timeEnd('Use dynamic filtered algorithm')
    console.timeEnd('Total API')

    return NextResponse.json(result)

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
