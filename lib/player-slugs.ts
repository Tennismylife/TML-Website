import { prisma } from './prisma';

export async function mapIdsToSlugs(ids: string[]): Promise<Record<string, string | null>> {
  const uniq = Array.from(new Set(ids.filter(Boolean).map(String)));
  if (uniq.length === 0) return {};
  const players = await prisma.player.findMany({ where: { id: { in: uniq } }, select: { id: true, slug: true } });
  const map: Record<string, string | null> = {};
  for (const id of uniq) map[id] = null;
  for (const p of players) map[String(p.id)] = p.slug ?? null;
  return map;
}
