import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// --- Prisma client reuse ---
const globalForPrisma = global as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const ageParam = url.searchParams.get('age');
    if (!ageParam) return NextResponse.json({ error: 'Age parameter required' }, { status: 400 });
    const targetAge = Number(ageParam);
    if (isNaN(targetAge)) return NextResponse.json({ error: 'Invalid age parameter' }, { status: 400 });

    const selectedSurfaces = url.searchParams.getAll('surface').filter(Boolean);
    const selectedRounds = url.searchParams.getAll('round').filter(Boolean);
    const selectedBestOf = url.searchParams.getAll('best_of').map(n => Number(n)).filter(n => !isNaN(n));

    // --- Build filter for matches ---
    const where: any = { status: true, tourney_level: 'G' }; // Grand Slam only
    if (selectedSurfaces.length > 0) where.surface = { in: selectedSurfaces };
    if (selectedRounds.length > 0) where.round = { in: selectedRounds };
    if (selectedBestOf.length > 0) where.best_of = { in: selectedBestOf };

    // --- Fetch all matches matching filters ---
    const matches = await prisma.match.findMany({
      where,
      select: {
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        winner_age: true,
        tourney_name: true,
      },
    });

    // --- Aggregate wins by player and Slam ---
    const slams = ['Australian Open', 'Roland Garros', 'Wimbledon', 'US Open'] as const;
    type SlamName = typeof slams[number];
    const playerSlamWins: Record<SlamName, Map<string, number[]>> = {} as any;
    slams.forEach(s => (playerSlamWins[s] = new Map()));

    const playerInfo = new Map<string, { name: string; ioc: string }>();

    for (const m of matches) {
      if (!m.winner_id || m.winner_age == null || !m.tourney_name) continue;
      const playerId = String(m.winner_id);
      const slamName = m.tourney_name as SlamName;
      if (!playerSlamWins[slamName]) continue;

      if (!playerInfo.has(playerId)) {
        playerInfo.set(playerId, { name: m.winner_name, ioc: m.winner_ioc ?? '' });
      }

      const arr = playerSlamWins[slamName].get(playerId) || [];
      arr.push(m.winner_age);
      playerSlamWins[slamName].set(playerId, arr);
    }

    // --- Build response directly with counts up to targetAge ---
    const result: Array<{
      id: string;
      name: string;
      ioc: string;
      australian: number;
      french: number;
      wimbledon: number;
      us: number;
      total: number;
    }> = [];

    const allPlayerIds = new Set<string>(Array.from(playerInfo.keys()));

    for (const pid of allPlayerIds) {
      const info = playerInfo.get(pid);
      if (!info) continue;

      const australian = (playerSlamWins['Australian Open'].get(pid) || []).filter(a => a <= targetAge).length;
      const french = (playerSlamWins['Roland Garros'].get(pid) || []).filter(a => a <= targetAge).length;
      const wimbledon = (playerSlamWins['Wimbledon'].get(pid) || []).filter(a => a <= targetAge).length;
      const us = (playerSlamWins['US Open'].get(pid) || []).filter(a => a <= targetAge).length;

      const total = australian + french + wimbledon + us;
      if (total > 0) {
        result.push({ id: pid, name: info.name, ioc: info.ioc, australian, french, wimbledon, us, total });
      }
    }

    // --- Sort descending by total wins ---
    result.sort((a, b) => b.total - a.total);
    const topPlayers = result.slice(0, 100);

    return NextResponse.json(topPlayers);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
