import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'Slug parameter is required' }, { status: 400 });
  }

  try {
    const player = await prisma.player.findUnique({
      where: { slug: slug },
      select: {
        id: true,
        atpname: true,
        slug: true,
        ioc: true,
        // Aggiungi altri campi se necessari
      }
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    return NextResponse.json({ player });
  } catch (error) {
    console.error('Error searching player by slug:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}