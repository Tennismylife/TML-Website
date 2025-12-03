import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest, context: any) {
  try {
    // support both Next.js versions where params can be a Promise or an object
    const params = await context?.params;
    const id = String(params?.id ?? '');
    
    // Fetch all matches for the tournament
    const matches = await prisma.match.findMany({
      where: { tourney_id: id },
      select: {
        year: true,
        winner_age: true,
        loser_age: true,
      },
    });

    if (!matches.length) {
      return NextResponse.json({ error: 'No matches found for this tournament' }, { status: 404 });
    }

    // Group by year and calculate average age per year
    const yearAges: Record<number, number[]> = {};
    for (const match of matches) {
      if (!yearAges[match.year]) yearAges[match.year] = [];
      if (match.winner_age) yearAges[match.year].push(match.winner_age);
      if (match.loser_age) yearAges[match.year].push(match.loser_age);
    }

    const chartData = Object.entries(yearAges)
      .map(([year, ages]) => ({
        year: parseInt(year),
        averageAge: ages.reduce((sum, age) => sum + age, 0) / ages.length,
      }))
      .sort((a, b) => a.year - b.year);

    // Calculate overall average age
    const allAges = Object.values(yearAges).flat();
    const overallAverage = (allAges.reduce((sum, age) => sum + age, 0) / allAges.length).toFixed(2);

    return NextResponse.json({ chartData, overallAverage });
  } catch (error) {
    console.error('Error fetching average age data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
