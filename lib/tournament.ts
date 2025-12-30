import { prisma } from './prisma';

// Resolve a route param (either numeric id or slug) to one or more tourney_id strings used in the match table
export async function resolveTourneyIds(param: string): Promise<string[] | null> {
  if (!param || param === "") return null;
  if (/^\d+$/.test(param)) {
    const idNum = parseInt(param, 10);
    // Preserve historic behavior: canonical AO id 580 should include 581 as well
    if (idNum === 580) return ['580', '581'];

    // If the numeric id exists as its own tournament row, prefer the exact id (e.g., 581 -> ['581'])
    const found = await prisma.tournament.findUnique({ where: { id: idNum }, select: { id: true } });
    if (found) return [String(idNum)];

    // Fallback: if id doesn't exist but it's 581, treat as AO pair
    if (idNum === 581) return ['580', '581'];

    // Otherwise return the numeric id as single-item array
    return [String(idNum)];
  }

  // Treat param as slug: lookup by DB slug only (do NOT compute slug from name)
  if (!param) return null;
  const found = await prisma.tournament.findUnique({ where: { slug: param }, select: { id: true } });
  if (!found) return null;
  // If slug resolves to AO canonical id 580, include 581 as well (1977 AO special-case)
  if (found.id === 580) return ['580', '581'];
  return [String(found.id)];
}

// Resolve a canonical tourney id for a route param.
// Numeric params are canonicalized (581 -> 580 for AO special-case).
// Slug params are resolved to the DB id.
export async function resolveCanonicalTourneyId(param: string): Promise<string | null> {
  if (!param || param === "") return null;
  if (/^\d+$/.test(param)) {
    const idNum = parseInt(param, 10);
    // canonicalize 581 to 580 (AO special-case)
    if (idNum === 581) return '580';
    return String(idNum);
  }

  const found = await prisma.tournament.findUnique({ where: { slug: param }, select: { id: true } });
  if (!found) return null;
  return String(found.id);
}
