import { getLevelFullName, extractUniqueSurfaces, extractNames } from '@/lib/utils';
import { getSurfaceColor, getLevelColor, getTextColorForRound } from '@/lib/colors';
import { prisma } from '@/lib/prisma';
import { resolveTourneyIds } from '@/lib/tournament';

interface TournamentHeaderServerProps {
  id: number;
}

// Funzione helper per edizioni
function formatEditionRanges(years: number[]): string[] {
  if (!years || years.length === 0) return [];
  const sorted = [...years].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    if (current === prev + 1) {
      prev = current;
      continue;
    }
    ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
    start = current;
    prev = current;
  }

  ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
  return ranges;
}

export default async function TournamentHeaderServer({ id }: TournamentHeaderServerProps) {
  // Fetch tournament data server-side
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      city: true,
      country: true,
      category: true,
      surfaces: true,
      indoor: true,
      slug: true,
    },
  });

  if (!tournament) return null;

  // Fetch editions
  const tourneyIds = (await resolveTourneyIds(String(id))) ?? [String(id)];
  const tourneyIdFilters = tourneyIds.flatMap((tid: string) => [
    { tourney_id: tid },
    { tourney_id: { endsWith: `-${tid}` } }
  ]);

  const editions = await prisma.match.findMany({
    where: { OR: tourneyIdFilters },
    distinct: ['year'],
    select: { year: true },
    orderBy: { year: 'desc' },
  });

  const years = editions.map((e) => e.year).filter((y): y is number => !!y);

  // Normalize categories
  const rawCategories = extractNames(tournament.category)
    .map((s) => String(s || '').trim())
    .filter(Boolean);

  const seenCats = new Set<string>();
  const categories: string[] = [];
  for (const c of rawCategories) {
    const key = c.toLowerCase();
    if (seenCats.has(key)) continue;
    seenCats.add(key);
    categories.push(c);
  }

  // Normalize surfaces
  const surfaces = extractUniqueSurfaces(tournament.surfaces);

  // Prepare display values
  const displayName = Array.isArray(tournament.name)
    ? (tournament.name as any[]).at(-1) || 'n/d'
    : (tournament.name as any) || 'n/d';

  const editionRanges = years.length > 0 ? formatEditionRanges(years) : [];

  return (
    <header className="relative bg-gradient-to-r from-green-700 via-green-500 to-yellow-400 text-white py-8 px-0 rounded-2xl mb-8 w-full shadow-xl overflow-hidden">
      <div className="md:absolute top-4 right-6 flex flex-wrap gap-2 z-20 md:justify-end justify-center">
        {categories.length > 0 &&
          categories.map((cat, i) => {
            const label = getLevelFullName(cat);
            const color = getLevelColor(cat) ?? '#555';
            const textColor = getTextColorForRound(color);
            return (
              <span
                key={i}
                title={label}
                className="px-3 py-1 rounded-full text-sm font-semibold shadow-md"
                style={{ backgroundColor: color, color: textColor }}
              >
                {label}
              </span>
            );
          })}
      </div>

      <div className="flex flex-col items-center justify-center text-center">
        <h2 className="text-4xl md:text-5xl font-extrabold drop-shadow-lg break-words whitespace-normal">
          {displayName}
        </h2>
        {(() => {
          const allNames = extractNames(tournament.name)
            .map((s) => (s || '').trim())
            .filter(Boolean);
          const displayNorm = String(displayName).trim().toLowerCase();
          const seen = new Set<string>();
          const others: string[] = [];
          for (const raw of allNames) {
            const n = String(raw).trim();
            const norm = n.toLowerCase();
            if (!n) continue;
            if (norm === displayNorm) continue;
            if (seen.has(norm)) continue;
            seen.add(norm);
            others.push(n);
          }
          if (others.length === 0) return null;
          return (
            <p className="mt-1 text-sm md:text-base text-white/80">
              {others.join(', ')}
            </p>
          );
        })()}
        {editionRanges.length > 0 && (
          <p className="mt-3 text-lg md:text-xl font-medium text-white/90">
            {editionRanges.join(', ')}
          </p>
        )}
      </div>

      <div className="md:absolute bottom-4 left-6 flex flex-wrap gap-2 md:justify-start justify-center mt-4 md:mt-0">
        {surfaces.map((surface, i) => (
          <span
            key={i}
            className="text-base md:text-lg font-medium px-3 py-1 rounded-full shadow-md"
            style={{
              backgroundColor: getSurfaceColor(surface) ?? '#888',
              color: getTextColorForRound(getSurfaceColor(surface) ?? '#888'),
            }}
          >
            {surface}
          </span>
        ))}
      </div>
    </header>
  );
}
