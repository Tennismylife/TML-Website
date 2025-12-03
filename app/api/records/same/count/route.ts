import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedSurfaces = url.searchParams.getAll('surface');
    const selectedLevels = url.searchParams.getAll('level');

    // Fetch matches with filters
    const matches = await prisma.match.findMany({
      where: {
        ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
        NOT: {
          OR: [
            { score: { contains: "W/O" } },
            { score: { contains: "DEF" } },
            { score: { contains: "WEA" } },
          ],
        },
      },
      select: {
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        loser_id: true,
        loser_name: true,
        loser_ioc: true,
        tourney_id: true,
        tourney_name: true,
        round: true,
      },
    });

    // Group wins by tourney_id (extracted) and winner_id
    const tournamentWins = new Map<string, Map<string, { name: string; ioc: string; wins: number; tourney_name: string }>>();

    // Group appearances by tourney_id (extracted) and player_id
    const tournamentPlayed = new Map<string, Map<string, { name: string; ioc: string; played: number; tourney_name: string }>>();

    // Group entries by tourney_id (extracted) and player_id
    const tournamentEntries = new Map<string, Map<string, { name: string; ioc: string; entries: Set<number>; tourney_name: string }>>();

    // Group titles by tourney_id (extracted) and winner_id
    const tournamentTitles = new Map<string, Map<string, { name: string; ioc: string; titles: number; tourney_name: string }>>();

    for (const m of matches) {
      if (!m.tourney_id || !m.tourney_name) continue;
      const tourneyId = m.tourney_id.split('-')[1];
      const year = parseInt(m.tourney_id.split('-')[0]);

      // For wins
      if (m.winner_id) {
        if (!tournamentWins.has(tourneyId)) {
          tournamentWins.set(tourneyId, new Map());
        }
        const players = tournamentWins.get(tourneyId)!;
        if (!players.has(String(m.winner_id))) {
          players.set(String(m.winner_id), { name: m.winner_name, ioc: m.winner_ioc ?? "", wins: 0, tourney_name: m.tourney_name });
        }
        players.get(String(m.winner_id))!.wins += 1;
      }

      // For played and entries
      const updatePlayer = (id: string | null, name: string, ioc: string | null) => {
        if (!id) return;
        // For played
        if (!tournamentPlayed.has(tourneyId)) {
          tournamentPlayed.set(tourneyId, new Map());
        }
        const playersPlayed = tournamentPlayed.get(tourneyId)!;
        if (!playersPlayed.has(String(id))) {
          playersPlayed.set(String(id), { name, ioc: ioc ?? "", played: 0, tourney_name: m.tourney_name });
        }
        playersPlayed.get(String(id))!.played += 1;

        // For entries
        if (!tournamentEntries.has(tourneyId)) {
          tournamentEntries.set(tourneyId, new Map());
        }
        const playersEntries = tournamentEntries.get(tourneyId)!;
        if (!playersEntries.has(String(id))) {
          playersEntries.set(String(id), { name, ioc: ioc ?? "", entries: new Set(), tourney_name: m.tourney_name });
        }
        playersEntries.get(String(id))!.entries.add(year);
      };
      updatePlayer(m.winner_id, m.winner_name, m.winner_ioc);
      updatePlayer(m.loser_id, m.loser_name, m.loser_ioc);

      // For titles
      if (m.winner_id && m.round === 'F') {
        if (!tournamentTitles.has(tourneyId)) {
          tournamentTitles.set(tourneyId, new Map());
        }
        const players = tournamentTitles.get(tourneyId)!;
        if (!players.has(String(m.winner_id))) {
          players.set(String(m.winner_id), { name: m.winner_name, ioc: m.winner_ioc ?? "", titles: 0, tourney_name: m.tourney_name });
        }
        players.get(String(m.winner_id))!.titles += 1;
      }
    }

    // Find top wins per tournament (top 2 players)
    const topSameTournamentWins: any[] = [];
    for (const [tourneyId, players] of tournamentWins) {
      const sortedPlayers = Array.from(players.values()).sort((a, b) => b.wins - a.wins).slice(0, 2);
      for (const player of sortedPlayers) {
        const id = Array.from(players.entries()).find(([k, v]) => v === player)?.[0];
        if (id) {
          topSameTournamentWins.push({ id, ...player, tourney_id: tourneyId });
        }
      }
    }
    topSameTournamentWins.sort((a, b) => b.wins - a.wins || a.tourney_name.localeCompare(b.tourney_name));

    // Find top played per tournament (top 2 players)
    const topSameTournamentPlayed: any[] = [];
    for (const [tourneyId, players] of tournamentPlayed) {
      const sortedPlayers = Array.from(players.values()).sort((a, b) => b.played - a.played).slice(0, 2);
      for (const player of sortedPlayers) {
        const id = Array.from(players.entries()).find(([k, v]) => v === player)?.[0];
        if (id) {
          topSameTournamentPlayed.push({ id, ...player, tourney_id: tourneyId });
        }
      }
    }
    topSameTournamentPlayed.sort((a, b) => b.played - a.played || a.tourney_name.localeCompare(b.tourney_name));

    // Find top entries per tournament (top 2 players)
    const topSameTournamentEntries: any[] = [];
    for (const [tourneyId, players] of tournamentEntries) {
      const sortedPlayers = Array.from(players.values()).map(p => ({ ...p, entries: p.entries.size })).sort((a, b) => b.entries - a.entries).slice(0, 2);
      for (const player of sortedPlayers) {
        const id = Array.from(players.entries()).find(([k, v]) => v.name === player.name && v.ioc === player.ioc)?.[0];
        if (id) {
          topSameTournamentEntries.push({ id, ...player, tourney_id: tourneyId });
        }
      }
    }
    topSameTournamentEntries.sort((a, b) => b.entries - a.entries || a.tourney_name.localeCompare(b.tourney_name));

    // Find top titles per tournament (top 2 players)
    const topSameTournamentTitles: any[] = [];
    for (const [tourneyId, players] of tournamentTitles) {
      const sortedPlayers = Array.from(players.values()).sort((a, b) => b.titles - a.titles).slice(0, 2);
      for (const player of sortedPlayers) {
        const id = Array.from(players.entries()).find(([k, v]) => v === player)?.[0];
        if (id) {
          topSameTournamentTitles.push({ id, ...player, tourney_id: tourneyId });
        }
      }
    }
    topSameTournamentTitles.sort((a, b) => b.titles - a.titles || a.tourney_name.localeCompare(b.tourney_name));

    // Get surfaces and levels for filters
    const surfaceList = await prisma.match.findMany({
      select: { surface: true },
      distinct: ['surface'],
      where: { surface: { not: null } },
    });
    const surfaces = surfaceList.map(s => s.surface).filter(Boolean);

    const levelList = await prisma.match.findMany({
      select: { tourney_level: true },
      distinct: ['tourney_level'],
      where: { tourney_level: { not: null } },
    });
    const levels = levelList.map(l => l.tourney_level).filter(Boolean);

    return NextResponse.json({
      topSameTournamentWins: topSameTournamentWins.slice(0, 100),
      topSameTournamentPlayed: topSameTournamentPlayed.slice(0, 100),
      topSameTournamentEntries: topSameTournamentEntries.slice(0, 100),
      topSameTournamentTitles: topSameTournamentTitles.slice(0, 100),
      surfaces,
      levels,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}