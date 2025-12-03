import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Assicurati di usare il pattern globale per PrismaClient

export async function GET() {
  try {
    // Surfaces
    const surfaces = await prisma.match.findMany({
      select: { surface: true },
      distinct: ['surface'],
      where: { surface: { not: null } },
    });

    // Levels
    const levels = await prisma.match.findMany({
      select: { tourney_level: true },
      distinct: ['tourney_level'],
      where: { tourney_level: { not: null } },
    });

    // Rounds
    const rounds = await prisma.match.findMany({
      select: { round: true },
      distinct: ['round'],
      where: { round: { not: null } },
    });

    // Best of
    const bestOfs = await prisma.match.findMany({
      select: { best_of: true },
      distinct: ['best_of'],
      where: { best_of: { not: null } },
    });

    return NextResponse.json({
      surfaces: surfaces.map(s => s.surface).filter(Boolean).sort(),
      levels: levels.map(l => l.tourney_level).filter(Boolean).sort(),
      rounds: rounds.map(r => r.round).filter(Boolean).sort(),
      bestOfs: bestOfs.map(b => b.best_of).filter(Boolean).sort((a, b) => a - b),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
