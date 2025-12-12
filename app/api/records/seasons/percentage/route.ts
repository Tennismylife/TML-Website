import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;
if (!globalThis.prisma) globalThis.prisma = new PrismaClient();
prisma = globalThis.prisma;

function getMultiParam(url: URL, key: string): string[] {
  return url.searchParams
    .getAll(key)
    .flatMap(v => v.split(','))
    .map(s => s.trim())
    .filter(Boolean);
}

function cacheHeaders() {
  return { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' };
}

function jsonResponse(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: cacheHeaders() });
}

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const selectedSurfaces = getMultiParam(url, 'surface');
    const selectedLevels = getMultiParam(url, 'tourney_level');
    const selectedRounds = getMultiParam(url, 'round');
    const selectedBestOf = getMultiParam(url, 'best_of');

    const totalFilters =
      selectedSurfaces.length + selectedLevels.length + selectedRounds.length + selectedBestOf.length;

    let finalData: any[] = [];

    // --- CASO 1: zero o un filtro → usa MV ---
    if (totalFilters <= 1) {
      const records = await prisma.mVSameSeasonPercentage.findMany({
        orderBy: { win_rate: 'desc' },
      });
      if (!records.length) return jsonResponse([]);

      const playerIds = records.map(r => r.player_id);
      const players = await prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, atpname: true, ioc: true },
      });
      const nameMap = Object.fromEntries(
        players.map(p => [p.id, { id: p.id, player_name: p.atpname ?? 'Unknown', ioc: p.ioc ?? null }])
      );

      finalData = records
        .filter(r => r.total_played >= 10)
        .map(r => {
          const player = nameMap[r.player_id];
          let wins = r.total_wins;
          let total = r.total_played;

          if (selectedSurfaces.length) {
            const surfaceFiltered = r.surface?.[selectedSurfaces[0]];
            wins = surfaceFiltered?.wins ?? 0;
            total = surfaceFiltered?.played ?? 0;
          } else if (selectedLevels.length) {
            const levelFiltered = r.level?.[selectedLevels[0]];
            wins = levelFiltered?.wins ?? 0;
            total = levelFiltered?.played ?? 0;
          } else if (selectedRounds.length) {
            const roundFiltered = r.round?.[selectedRounds[0]];
            wins = roundFiltered?.wins ?? 0;
            total = roundFiltered?.played ?? 0;
          } else if (selectedBestOf.length) {
            const bestOfFiltered = r.best_of?.[selectedBestOf[0]];
            wins = bestOfFiltered?.wins ?? 0;
            total = bestOfFiltered?.played ?? 0;
          }

          const winRate = total > 0 ? ((wins / total) * 100).toFixed(2) + '%' : '0%';

          return {
            Player: player.player_name,
            PlayerId: player.id, // ID preso dalla tabella Player
            Wins: wins,
            Total: total,
            Percentage: winRate,
            Year: r.year,
            ioc: player.ioc,
          };
        })
        .filter(p => p.Total > 0);
    }

    // --- CASO 2: due o più filtri → calcolo dinamico dai match ---
    if (totalFilters >= 2) {
      const where: any = { status: true };
      if (selectedSurfaces.length) where.surface = { in: selectedSurfaces };
      if (selectedLevels.length) where.tourney_level = { in: selectedLevels };
      if (selectedRounds.length) where.round = { in: selectedRounds };
      if (selectedBestOf.length) {
        const bestOfNumbers = selectedBestOf.map(v => parseInt(v, 10)).filter(v => !isNaN(v));
        if (bestOfNumbers.length) where.best_of = { in: bestOfNumbers };
      }

      const winnerAgg = await prisma.match.groupBy({
        by: ['winner_id', 'year'],
        where,
        _count: { winner_id: true },
      });
      const loserAgg = await prisma.match.groupBy({
        by: ['loser_id', 'year'],
        where,
        _count: { loser_id: true },
      });

      const playerYearMap: Record<string, { wins: number; played: number }> = {};

      winnerAgg.forEach(w => {
        const key = `${w.winner_id}_${w.year}`;
        playerYearMap[key] = playerYearMap[key] || { wins: 0, played: 0 };
        playerYearMap[key].wins += w._count.winner_id;
        playerYearMap[key].played += w._count.winner_id;
      });

      loserAgg.forEach(l => {
        const key = `${l.loser_id}_${l.year}`;
        playerYearMap[key] = playerYearMap[key] || { wins: 0, played: 0 };
        playerYearMap[key].played += l._count.loser_id;
      });

      // Filtra giocatori con meno di 10 match
      const filteredPlayerYearMap = Object.fromEntries(
        Object.entries(playerYearMap).filter(([_, v]) => v.played >= 10)
      );

      const keys = Object.keys(filteredPlayerYearMap);
      const playerIds = Array.from(new Set(keys.map(k => k.split('_')[0])));
      const players = await prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, atpname: true, ioc: true },
      });
      const nameMap = Object.fromEntries(
        players.map(p => [p.id, { id: p.id, player_name: p.atpname ?? 'Unknown', ioc: p.ioc ?? null }])
      );

      finalData = keys.map(k => {
        const [pid, yearStr] = k.split('_');
        const year = parseInt(yearStr, 10);
        const stats = filteredPlayerYearMap[k];
        const player = nameMap[pid];
        return {
          Player: player?.player_name ?? 'Unknown',
          PlayerId: player?.id ?? pid, // ID preso dalla tabella Player
          Wins: stats.wins,
          Total: stats.played,
          Percentage: ((stats.wins / stats.played) * 100).toFixed(2) + '%',
          Year: year,
          ioc: player?.ioc ?? null,
        };
      });
    }

    // --- ORDINA PER PERCENTUALE DECRESCENTE E ASSEGNA RANK ---
    finalData.sort(
      (a, b) =>
        parseFloat(b.Percentage.replace('%', '')) -
          parseFloat(a.Percentage.replace('%', '')) || b.Year - a.Year
    );
    finalData = finalData.map((item, idx) => ({ ...item, Rank: idx + 1 }));

    return jsonResponse(finalData.slice(0, 100));
  } catch (error) {
    console.error('GET /records/seasons/percentage error:', error);
    return jsonResponse({ error: 'Internal Server Error' }, 500);
  }
}
