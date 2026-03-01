/**
 * Server-only helper to resolve a tournament's display name from the database.
 * Keep this file separate from recordMetadata.ts so that client components
 * importing makeLeastLabel / makeTitle / humanize do NOT pull prisma into the
 * browser bundle.
 */
import { prisma } from './prisma';
import { resolveCanonicalTourneyId } from './tournament';
import { humanize } from './recordMetadata';

function extractName(nameField: any): string {
  if (!nameField) return '';
  if (typeof nameField === 'string') {
    if (/^\d+$/.test(nameField.trim())) return '';
    return nameField;
  }
  if (typeof nameField === 'number' || typeof nameField === 'boolean') return '';
  if (Array.isArray(nameField)) {
    let last = '';
    for (const v of nameField) {
      const r = extractName(v);
      if (r) last = r;
    }
    return last;
  }
  if (typeof nameField === 'object') {
    let last = '';
    for (const v of Object.values(nameField)) {
      const r = extractName(v);
      if (r) last = r;
    }
    return last;
  }
  return '';
}

export async function getTournamentName(id: string): Promise<string> {
  let tournamentName = humanize(String(id).replace(/-/g, ' '));
  try {
    let tournament: any = null;
    if (/^\d+$/.test(id)) {
      const canonical = await resolveCanonicalTourneyId(id);
      const numId = parseInt(canonical ?? id, 10);
      tournament = await prisma.tournament.findUnique({
        where: { id: numId },
        select: { name: true, slug: true },
      });
    } else {
      tournament = await prisma.tournament.findUnique({
        where: { slug: id },
        select: { name: true, slug: true },
      });
    }
    if (tournament) {
      const raw = extractName(tournament.name);
      if (raw) {
        tournamentName = humanize(raw);
      } else if (tournament.slug && !/^\d+$/.test(String(tournament.slug))) {
        tournamentName = humanize(String(tournament.slug).replace(/-/g, ' '));
      }
    }
  } catch (e) {
    // ignore and keep humanized id as fallback
  }
  return tournamentName;
}

/**
 * Resolves the slug string for a tournament given either its numeric id or slug.
 * If `id` is already non-numeric it is returned as-is.
 */
export async function getTournamentSlug(id: string): Promise<string> {
  if (!id) return id;
  // Already a slug (not purely numeric)
  if (!/^\d+$/.test(id)) return id;
  try {
    const canonical = await resolveCanonicalTourneyId(id);
    const numId = parseInt(canonical ?? id, 10);
    const tournament = await prisma.tournament.findUnique({
      where: { id: numId },
      select: { slug: true },
    });
    if (tournament?.slug && !/^\d+$/.test(String(tournament.slug))) {
      return String(tournament.slug);
    }
  } catch (e) {
    // ignore – return original id as fallback
  }
  return id;
}
