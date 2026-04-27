import { prisma } from '@/lib/prisma';

const INDEX_SNAPSHOT_DATE = new Date('2026-04-20T00:00:00.000Z');
const SURFACE_PAGE_MANUAL_ALLOWLIST = new Set(['alex-molcan']);
const SEASON_INDEX_MANUAL_ALLOWLIST = new Set(['alex-molcan']);
const SEASON_ALWAYS_INDEX_YEARS = new Set([2024, 2025, 2026]);

async function resolvePlayerForIndexing(idOrSlug: string) {
  const value = String(idOrSlug);
  const isSlug = !/^\d+$/.test(value);

  if (isSlug) {
    return prisma.player.findUnique({
      where: { slug: value.toLowerCase() },
      select: { id: true, slug: true },
    });
  }

  return prisma.player.findUnique({
    where: { id: value },
    select: { id: true, slug: true },
  });
}

export async function isPlayerInTop100IndexAllowlist(idOrSlug: string): Promise<boolean> {
  try {
    const player = await resolvePlayerForIndexing(idOrSlug);
    if (!player?.id) return false;
    if (player.slug && SURFACE_PAGE_MANUAL_ALLOWLIST.has(player.slug)) {
      return true;
    }

    const rankingDate = await prisma.rankingDate.findFirst({
      where: { date: INDEX_SNAPSHOT_DATE },
      select: { id: true },
    });
    if (!rankingDate?.id) return false;

    const rankingRow = await prisma.ranking.findFirst({
      where: {
        rankingDateId: rankingDate.id,
        playerId: player.id,
        rank: { lte: 100 },
      },
      select: { id: true },
    });

    return Boolean(rankingRow);
  } catch {
    return false;
  }
}

async function hasPlayerEverBeenTop10(playerId: string): Promise<boolean> {
  try {
    const count = await prisma.ranking.count({
      where: {
        playerId,
        rank: { lte: 10 },
      },
    });
    return count > 0;
  } catch {
    return false;
  }
}

async function hasPlayerEverBeenTop20(playerId: string): Promise<boolean> {
  try {
    const count = await prisma.ranking.count({
      where: {
        playerId,
        rank: { lte: 20 },
      },
    });
    return count > 0;
  } catch {
    return false;
  }
}

async function hasPlayerPlayedInLast18Months(playerId: string): Promise<boolean> {
  try {
    const threshold = new Date();
    threshold.setMonth(threshold.getMonth() - 18);

    const count = await prisma.match.count({
      where: {
        status: true,
        tourney_date: { gte: threshold },
        tourney_level: { not: 'D' },
        OR: [
          { winner_id: playerId },
          { loser_id: playerId },
        ],
      },
    });

    return count > 0;
  } catch {
    return false;
  }
}

async function hasPlayerWonAtLeastOneAtpTitle(playerId: string): Promise<boolean> {
  try {
    const count = await prisma.match.count({
      where: {
        status: true,
        round: 'F',
        team_event: false,
        tourney_level: { not: 'D' },
        winner_id: playerId,
        NOT: {
          OR: [
            { score: { contains: 'WEA' } },
            { score: 'To play' },
          ],
        },
      },
    });

    return count > 0;
  } catch {
    return false;
  }
}

async function shouldIndexPlayerLanding(idOrSlug: string): Promise<boolean> {
  const player = await resolvePlayerForIndexing(idOrSlug);
  if (!player?.id) return false;

  const rankingDate = await prisma.rankingDate.findFirst({
    where: { date: INDEX_SNAPSHOT_DATE },
    select: { id: true },
  });
  if (rankingDate?.id) {
    const rankingRow = await prisma.ranking.findFirst({
      where: {
        rankingDateId: rankingDate.id,
        playerId: player.id,
      },
      select: { id: true },
    });
    if (rankingRow) {
      return true;
    }
  }

  if (await hasPlayerPlayedInLast18Months(player.id)) {
    return true;
  }

  if (await hasPlayerWonAtLeastOneAtpTitle(player.id)) {
    return true;
  }

  return await hasPlayerEverBeenTop20(player.id);
}

export async function getPlayerTop100Robots(idOrSlug: string): Promise<{ index: boolean; follow: boolean }> {
  return {
    index: await isPlayerInTop100IndexAllowlist(idOrSlug),
    follow: true,
  };
}

export async function getPlayerLandingRobots(idOrSlug: string): Promise<{ index: boolean; follow: boolean }> {
  return {
    index: await shouldIndexPlayerLanding(idOrSlug),
    follow: true,
  };
}

export async function shouldIndexPlayerSeason(idOrSlug: string, year: number): Promise<boolean> {
  const player = await resolvePlayerForIndexing(idOrSlug);
  if (!player?.id) return false;

  if (player.slug && SEASON_INDEX_MANUAL_ALLOWLIST.has(player.slug)) {
    return true;
  }

  const y = Number(year);
  if (!Number.isInteger(y) || y < 1900 || y > new Date().getFullYear() + 1) {
    return false;
  }

  const totalMatches = await prisma.match.count({
    where: {
      year: y,
      status: true,
      OR: [{ winner_id: player.id }, { loser_id: player.id }],
    },
  });

  if (totalMatches === 0) {
    return false;
  }

  if (y >= 2024) {
    return true;
  }

  const everTop10 = await hasPlayerEverBeenTop10(player.id);
  return everTop10;
}

export async function getPlayerSeasonRobots(idOrSlug: string, year: number): Promise<{ index: boolean; follow: boolean }> {
  return {
    index: await shouldIndexPlayerSeason(idOrSlug, year),
    follow: true,
  };
}
