import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Prisma client globale per evitare connessioni multiple in dev
declare global {
  var prisma: PrismaClient | undefined
}
const prisma = globalThis.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)

    const selectedSurfaces = url.searchParams.getAll('surface').filter(Boolean)
    const selectedLevels   = url.searchParams.getAll('level').filter(Boolean)

    const filtersCount = [selectedSurfaces.length > 0, selectedLevels.length > 0].filter(Boolean).length

    console.time('Total API')

    // =====================================================
    // CASE 1 → 0 o 1 filtro → usa la materialized view mv_entries_ages
    // =====================================================
    if (filtersCount <= 1) {
      console.time('Use materialized view mv_entries_ages')

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

      // Ottimizzazione: map per accesso O(1)
      const mvMap = new Map(data.map(d => [d.player_id, d]))

      const result = players.map(p => {
        const mv = mvMap.get(p.id)
        let ages = mv?.ages_json ?? {}

        if (selectedSurfaces.length === 1)
          ages = mv?.ages_by_surface_json?.[selectedSurfaces[0]] ?? {}
        else if (selectedLevels.length === 1)
          ages = mv?.ages_by_level_json?.[selectedLevels[0]] ?? {}

        return {
          id: p.id,
          name: p.player,
          ioc: p.ioc ?? '',
          ages: { ages_json: ages },
        }
      })

      console.timeEnd('Use materialized view mv_entries_ages')
      console.timeEnd('Total API')
      return NextResponse.json(result)
    }

    // =====================================================
    // CASE 2 → 2 o più filtri → query dinamica completa
    // =====================================================
    console.time('Use dynamic filtered algorithm')

    const where: any = {
      status: true,
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
      },
    })
    console.timeEnd('FindMany matches (entries)')

    // Mappa cumulativa età per player
    const ageMap = new Map<string, Record<string, number>>()

    for (const m of matches) {
      const process = (pid: string | null, age: number | null) => {
        if (!pid || age == null) return
        const ageNum = Number(age)
        if (!Number.isFinite(ageNum)) return

        // Recupero o inizializzo il record dell'età
        let playerAges = ageMap.get(pid)
        if (!playerAges) {
          playerAges = {}
          ageMap.set(pid, playerAges)
        }

        // Accumulo corretto delle occorrenze
        const key = ageNum.toFixed(3)
        playerAges[key] = (playerAges[key] ?? 0) + 1
      }

      process(m.winner_id, m.winner_age)
      process(m.loser_id, m.loser_age)
    }

    const playerIds = Array.from(ageMap.keys())

    console.time('FindMany playersInfo')
    const playersInfo = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, player: true, ioc: true },
    })
    console.timeEnd('FindMany playersInfo')

    const result = playersInfo.map(p => ({
      id: p.id,
      name: p.player,
      ioc: p.ioc ?? '',
      ages: { ages_json: ageMap.get(p.id) ?? {} },
    }))

    console.timeEnd('Use dynamic filtered algorithm')
    console.timeEnd('Total API')

    return NextResponse.json(result)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
