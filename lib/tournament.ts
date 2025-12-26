import { prisma } from './prisma';

// Resolve a route param (either numeric id or slug) to one or more tourney_id strings used in the match table
export async function resolveTourneyIds(param: string): Promise<string[] | null> {
  if (!param) return null;
  if (/^\d+$/.test(param)) {
    const idNum = parseInt(param, 10);
    // special-case: AO 1977 has two internal tourney ids
    if (idNum === 580) return ['580', '581'];
    return [String(idNum)];
  }

  // Treat param as slug: lookup by DB slug only (do NOT compute slug from name)
  const found = await prisma.tournament.findUnique({ where: { slug: param }, select: { id: true } });
  if (!found) return null;
  return [String(found.id)];
}
