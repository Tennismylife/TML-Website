import { prisma } from '@/lib/prisma';

const INDEX_SNAPSHOT_DATE = new Date('2026-04-06T00:00:00.000Z');
const SURFACE_PAGE_MANUAL_ALLOWLIST = new Set(['alex-molcan']);

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

export async function getPlayerTop100Robots(idOrSlug: string): Promise<{ index: boolean; follow: boolean }> {
  return {
    index: await isPlayerInTop100IndexAllowlist(idOrSlug),
    follow: true,
  };
}