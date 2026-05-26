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
/**
 * Extracts all category string values from a Json? field (string | array | object).
 */
function collectCategoryVals(category: any): string[] {
  const vals: string[] = [];
  function collect(v: any) {
    if (typeof v === 'string') vals.push(v.toUpperCase().trim());
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object') Object.values(v).forEach(collect);
  }
  collect(category);
  return vals;
}

/**
 * Returns true if the tournament should have its records pages indexed.
 * - Grand Slam, Masters 1000, Finals, Olympics → always indexed.
 * - ATP 500, ATP 250 → indexed only if the Tournament.years field in the DB
 *   contains at least one year >= 2020 (i.e. the tournament still runs recently).
 * - Everything else (category "A", Davis Cup, WCT, etc.) → noindex.
 *
 * @param category  Tournament.category (Json?) from the DB
 * @param years     Tournament.years (Json?) from the DB — array of edition-year strings
 */
const SLAM_RECORDS_TOURNAMENT_SLUGS = new Set([
  'australian-open',
  'roland-garros',
  'wimbledon',
  'us-open',
]);

export function shouldIndexRecords(category: any, years?: any): boolean {
  const vals = collectCategoryVals(category);
  const ALWAYS = new Set(['G', 'M', 'F', 'O', 'GRAND_SLAM', 'MASTERS_1000', 'FINALS', 'OLYMPICS']);
  if (vals.some(v => ALWAYS.has(v))) return true;
  const RECENT = new Set(['500', '250', 'ATP500', 'ATP250']);
  if (vals.some(v => RECENT.has(v))) {
    // years is a Json array of strings like ["1997","2024"]
    const yearsList: string[] = Array.isArray(years) ? years : [];
    const maxYear = yearsList.reduce((max, y) => {
      const n = parseInt(String(y), 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);
    return maxYear >= 2020;
  }
  return false;
}

export function isSlamTournamentSlug(slug?: string | null): boolean {
  if (!slug) return false;
  return SLAM_RECORDS_TOURNAMENT_SLUGS.has(String(slug).toLowerCase());
}

/**
 * @deprecated Use shouldIndexRecords() instead.
 * Kept for backwards compatibility.
 */
export function isMajorCategory(category: any): boolean {
  return shouldIndexRecords(category, [String(new Date().getFullYear())]);
}

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
