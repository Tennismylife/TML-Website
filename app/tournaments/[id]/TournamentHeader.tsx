'use client'

import { useState, useEffect } from 'react';
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

export default function TournamentHeader({ id }: TournamentHeaderProps) {
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    fetch(`/api/tournaments/${id}/header`)
      .then(res => res.json())
      .then((data) => {
        setTournament(data);
        console.debug('TournamentHeader loaded', data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!tournament) return null;

  // Prepare display values
  const displayName = Array.isArray(tournament.name) ? (tournament.name as any[]).at(-1) || 'n/d' : (tournament.name as any) || 'n/d';

  const levelLabels = (tournament.category || []).map((l: string) => getLevelFullName(l));
  const surfaces = tournament.surfaces || [];
  const editionRanges = tournament.editions && tournament.editions.length > 0 ? formatEditionRanges(tournament.editions) : [];

  return (
    <header className="relative bg-gradient-to-r from-green-700 via-green-500 to-yellow-400 text-white p-8 rounded-2xl mb-8 w-full shadow-xl overflow-hidden">
      <div className="absolute top-4 right-6 flex flex-wrap gap-2 z-20">
        {(() => {
          // Use ONLY tournament.category (deduplicated, preserve order)
          const sourceCats = (extractNames(tournament?.category || []) as string[]);
          const seen = new Set<string>();
          const cats: string[] = [];
          for (const c of sourceCats) {
            const s = String(c || '').trim();
            if (!s) continue;
            const key = s.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            cats.push(s);
          }

          if (cats.length === 0) {
            // no categories defined on tournament.category -> hide area
            return null;
          }

          return cats.map((cat, i) => {
            const label = getLevelFullName(cat);
            const color = getLevelColor(cat) ?? '#555';
            const textColor = getTextColorForRound(color);
            return (
              <span key={i} title={label} className="px-3 py-1 rounded-full text-sm font-semibold shadow-md" style={{ backgroundColor: color, color: textColor }}>
                {label}
              </span>
            );
          });
        })()}
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
