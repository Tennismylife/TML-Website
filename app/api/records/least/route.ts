import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
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
      surfaces,
      levels,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}