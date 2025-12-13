import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// --- Prisma client reuse ---
const globalForPrisma = global as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient({ log: ['error', 'warn'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    // --- Parametri ---
    const nParam = url.searchParams.get('n');
    const n = nParam ? parseInt(nParam, 10) : 1;
    if (isNaN(n) || n < 1) return NextResponse.json({ error: 'Invalid parameter n' }, { status: 400 });

    const selectedSurfaces = url.searchParams.getAll('surface');
    const selectedRounds = url.searchParams.getAll('round');
    const selectedLevels = url.searchParams.getAll('level');

    // --- Filtro base ---
    const where: any = { status: true };
    if (selectedSurfaces.length > 0) where.surface = { in: selectedSurfaces };
    if (selectedRounds.length > 0) where.round = { in: selectedRounds };
    if (selectedLevels.length > 0) where.tourney_level = { in: selectedLevels };

    // --- Prendi tutte le partite filtrate ---
    const matches = await prisma.match.findMany({
      where,
      select: {
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        winner_age: true,
        loser_id: true,
        loser_name: true,
        loser_ioc: true,
        loser_age: true,
        round: true,
      },
      orderBy: { tourney_date: 'asc' } // Assicuriamoci ordine cronologico
    });

    // --- Raggruppa partecipazioni al round per giocatore ---
    type PlayerRounds = { name: string; ioc: string; ages: number[] };
    const playerRounds = new Map<string, PlayerRounds>();

    for (const m of matches) {
      // --- Winner ---
      if (m.winner_id && m.winner_age != null) {
        const id = String(m.winner_id);
        if (!playerRounds.has(id)) {
          playerRounds.set(id, { name: m.winner_name, ioc: m.winner_ioc ?? '', ages: [] });
        }
        playerRounds.get(id)!.ages.push(m.winner_age);
      }

      // --- Loser ---
      if (m.loser_id && m.loser_age != null) {
        const id = String(m.loser_id);
        if (!playerRounds.has(id)) {
          playerRounds.set(id, { name: m.loser_name, ioc: m.loser_ioc ?? '', ages: [] });
        }
        playerRounds.get(id)!.ages.push(m.loser_age);
      }
    }

    // --- Calcola età alla N-esima partecipazione ---
    const results: any[] = [];
    playerRounds.forEach((info, id) => {
      if (info.ages.length >= n) {
        const ageNthRound = info.ages[n - 1];
        results.push({
          id,
          name: info.name,
          ioc: info.ioc,
          age_nth_round: ageNthRound,
        });
      }
    });

    // --- Ordina per età crescente ---
    results.sort((a, b) => a.age_nth_round - b.age_nth_round);

    // --- Limita a primi 100 ---
    const topResults = results.slice(0, 100);

    return NextResponse.json(topResults);

  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
