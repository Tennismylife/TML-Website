import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

interface H2HRecord {
  player_1: { id: string; name: string; ioc: string };
  player_2: { id: string; name: string; ioc: string };
  wins_player1: number;
  wins_player2: number;
  total_h2h: number;
}

const globalForPrisma = global as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient({ log: ['error', 'warn'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// --- Helper per arricchire H2H con dati giocatori ---
function enrichH2H(
  h2hArray: { player1_id: string; player2_id: string; wins1: number; wins2: number; total: number; wins_player1?: number; wins_player2?: number; total_matches?: number }[],
  players: { id: number | string; atpname: string; ioc: string }[]
): H2HRecord[] {
  const playerMap = Object.fromEntries(players.map(p => [p.id.toString(), { name: p.atpname, ioc: p.ioc }]));
  return h2hArray.map(p => ({
    player_1: { id: p.player1_id, name: playerMap[p.player1_id]?.name ?? '', ioc: playerMap[p.player1_id]?.ioc ?? '' },
    player_2: { id: p.player2_id, name: playerMap[p.player2_id]?.name ?? '', ioc: playerMap[p.player2_id]?.ioc ?? '' },
    wins_player1: p.wins1 ?? p.wins_player1 ?? 0,
    wins_player2: p.wins2 ?? p.wins_player2 ?? 0,
    total_h2h: p.total ?? p.total_matches ?? 0,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedSurface = url.searchParams.get('surface');
    const selectedLevel = url.searchParams.get('tourney_level') || url.searchParams.get('level');
    const selectedRound = url.searchParams.get('round');
    const selectedBestOf = url.searchParams.get('bestOf');

    const filters = [selectedSurface, selectedLevel, selectedRound, selectedBestOf].filter(Boolean);

    // --- CASO 1: singolo filtro o nessun filtro (usa tabella pre-aggregata) ---
    if (filters.length <= 1) {
      const row = await prisma.mVH2HCount.findFirst({
        select: {
          global_h2h: true,
          by_surface: true,
          by_tourney_level: true,
          by_best_of: true,
          by_round: true,
        },
      });

      if (!row) return NextResponse.json({ h2h: [] });

      let output: any[] = [];
      if (selectedSurface) output = (row.by_surface?.[selectedSurface] as any[]) ?? [];
      else if (selectedLevel) output = (row.by_tourney_level?.[selectedLevel] as any[]) ?? [];
      else if (selectedRound) output = (row.by_round?.[selectedRound] as any[]) ?? [];
      else if (selectedBestOf) output = (row.by_best_of?.[selectedBestOf] as any[]) ?? [];
      else output = (row.global_h2h as any[]) ?? [];

      output = output
        .sort((a, b) => (b.total_matches ?? 0) - (a.total_matches ?? 0))
        .slice(0, 100);

      const playerIds = Array.from(
        new Set(output.flatMap(p => [p.player1_id, p.player2_id]).filter(Boolean))
      );

      const players = await prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, atpname: true, ioc: true },
      });

      return NextResponse.json({ h2h: enrichH2H(output, players) });
    }

    // --- CASO 2: multi-filtro, calcolo H2H dinamico ---
    const where: any = {};
    if (selectedSurface) where.surface = selectedSurface;
    if (selectedLevel) where.tourney_level = selectedLevel;
    if (selectedRound) where.round = selectedRound;
    if (selectedBestOf) {
      const bestOfNum = Number(selectedBestOf);
      if (!isNaN(bestOfNum)) where.best_of = bestOfNum;
    }

    const matches = await prisma.match.findMany({
      where,
      select: { winner_id: true, loser_id: true },
    });

    type H2HMap = { [key: string]: { player1_id: string; player2_id: string; wins1: number; wins2: number; total: number } };
    const h2hMap: H2HMap = {};

    for (const m of matches) {
      const winnerId = m.winner_id;
      const loserId = m.loser_id;
      const [p1, p2] = winnerId < loserId ? [winnerId, loserId] : [loserId, winnerId];
      const key = `${p1}_${p2}`;

      if (!h2hMap[key]) h2hMap[key] = { player1_id: p1, player2_id: p2, wins1: 0, wins2: 0, total: 0 };
      if (winnerId === h2hMap[key].player1_id) h2hMap[key].wins1 += 1;
      else h2hMap[key].wins2 += 1;
      h2hMap[key].total += 1;
    }

    const h2hArray = Object.values(h2hMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 100);

    const playerIds = Array.from(new Set(h2hArray.flatMap(p => [p.player1_id, p.player2_id])));
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, atpname: true, ioc: true },
    });

    return NextResponse.json({ h2h: enrichH2H(h2hArray, players) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
