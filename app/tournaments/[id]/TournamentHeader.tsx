import { prisma } from '@/lib/prisma';
import { getLevelFullName, extractUniqueSurfaces, extractNames } from '@/lib/utils';
import { getSurfaceColor, getLevelColor, getTextColorForRound } from '@/lib/colors';

interface TournamentHeaderProps {
  id?: number;
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

export default async function TournamentHeader({ id }: TournamentHeaderProps) {
  if (!id) return null;

  // Fetch tournament and editions server-side
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      surfaces: true,
      indoor: true,
      city: true,
      country: true,
      category: true,
      slug: true,
    },
  });

  if (!tournament) return null;

  // Fetch distinct editions (years) from matches
  const editions = await prisma.match.findMany({
    where: {
      OR: [{ tourney_id: String(id) }, { tourney_id: { endsWith: `-${id}` } }],
    },
    distinct: ['year'],
    select: { year: true },
    orderBy: { year: 'desc' },
  });

  const years = editions.map(e => e.year).filter((y): y is number => !!y);

  // Prepare display values
  const displayName = Array.isArray(tournament.name) ? (tournament.name as any[]).at(-1) || 'n/d' : (tournament.name as any) || 'n/d';

  let rawCategories: string[] = [];
  if (Array.isArray(tournament.category)) rawCategories = tournament.category as string[];
  else if (tournament.category) rawCategories = [String(tournament.category)];
  else {
    // Try to derive categories from RankingTable entries for the editions we found
    const rtEntries = await prisma.rankingTable.findMany({
      where: { tourney_id: String(id), year: { in: years.map(String) } },
      select: { atp_category: true },
    });
    rawCategories = rtEntries.map(r => r.atp_category).filter(Boolean) as string[];
  }

  const seenCats = new Set<string>();
  const uniqueCategories: string[] = [];
  for (const c of rawCategories.map((s: any) => String(s || '').trim()).filter(Boolean)) {
    const key = c.toUpperCase();
    if (seenCats.has(key)) continue;
    seenCats.add(key);
    uniqueCategories.push(c);
  }

  const levelLabels = uniqueCategories.map((l) => getLevelFullName(l));
  const surfaces = extractUniqueSurfaces(tournament.surfaces);
  const editionRanges = years && years.length > 0 ? formatEditionRanges(years) : [];

  return (
    <header className="relative bg-gradient-to-r from-green-700 via-green-500 to-yellow-400 text-white p-8 rounded-2xl mb-8 w-full shadow-xl overflow-hidden">
      <div className="absolute top-4 right-6 flex flex-wrap gap-2">
        {levelLabels.map((label, i) => {
          const color = getLevelColor(label) ?? '#555';
          const textColor = getTextColorForRound(color);
          return (
            <span key={i} className="px-4 py-1 rounded-full text-sm font-semibold shadow-md" style={{ backgroundColor: color, color: textColor }}>
              {label}
            </span>
          );
        })}
      </div>

      <div className="flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold drop-shadow-lg break-words whitespace-normal">{displayName}</h1>
        {(() => {
          const allNames = extractNames(tournament.name).map((s) => (s || '').trim()).filter(Boolean);
          const displayNorm = String(displayName).trim().toLowerCase();
          const seen = new Set<string>();
          const others: string[] = [];
          for (const raw of allNames) {
            const n = String(raw).trim();
            const norm = n.toLowerCase();
            if (!n) continue;
            if (norm === displayNorm) continue; // exclude main display name
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
          <p className="mt-3 text-lg md:text-xl font-medium text-white/90">{editionRanges.join(', ')}</p>
        )}
      </div>

      <div className="absolute bottom-4 left-6 flex flex-wrap gap-2">
        {surfaces.map((surface, i) => (
          <span key={i} className="text-base md:text-lg font-medium px-3 py-1 rounded-full shadow-md" style={{ backgroundColor: getSurfaceColor(surface) ?? '#888', color: getTextColorForRound(getSurfaceColor(surface) ?? '#888') }}>{surface}</span>
        ))}
      </div>
    </header>
  );
}
