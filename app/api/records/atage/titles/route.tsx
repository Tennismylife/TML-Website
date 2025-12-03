// app/api/records/atage/titles/route.tsx

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedSurfaces = url.searchParams.getAll('surface');
    const selectedLevels = url.searchParams.getAll('level');
    const selectedRounds = url.searchParams.getAll('round');
    const selectedBestOf = url.searchParams.getAll('best_of');

    const matches = await prisma.match.findMany({
      where: {
        team_event: false,
        round: 'F',
        NOT: { OR: [{ score: { contains: "WEA" } }] },
        ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
        ...(selectedRounds.length > 0 && { round: { in: selectedRounds } }),
        ...(selectedBestOf.length > 0 && { best_of: { in: selectedBestOf.map(b => parseInt(b, 10)).filter(n => !isNaN(n)) } }),
      },
      select: {
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        winner_age: true,
        event_id: true,
      },
    });

    type PlayerAgeData = {
      name: string;
      ioc: string;
      ages: { age: number; event_ids: string[] }[];
    };

    const playerAgeTitles = new Map<string, PlayerAgeData>();

    const addPlayerEvent = (player_id: string, name: string, ioc: string, age: number, event_id: string) => {
      if (!playerAgeTitles.has(player_id)) {
        playerAgeTitles.set(player_id, { name, ioc, ages: [] });
      }
      const entry = playerAgeTitles.get(player_id)!;
      const ageEntry = entry.ages.find(a => a.age === age);
      if (ageEntry) {
        if (!ageEntry.event_ids.includes(event_id)) {
          ageEntry.event_ids.push(event_id);
        }
      } else {
        entry.ages.push({ age, event_ids: [event_id] });
      }
    };

    for (const m of matches) {
      if (m.winner_id && m.winner_age && m.event_id) {
        addPlayerEvent(m.winner_id, m.winner_name, m.winner_ioc || '', Math.floor(m.winner_age), m.event_id);
      }
    }

    const result = Array.from(playerAgeTitles.entries()).map(([id, data]) => ({
      id,
      ...data
    }));

    return NextResponse.json(result);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}