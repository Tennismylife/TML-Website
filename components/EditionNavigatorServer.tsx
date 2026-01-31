import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getTourneyHref } from '@/lib/utils';

type Edition = { year: number; tourney_id?: string | number };

export default function EditionNavigatorServer({
  id,
  slug = null,
  editions = [],
  currentYear,
  idSuffix = 'bottom',
  sticky = false,
  compact = false,
}: {
  id: string | number;
  slug?: string | null;
  editions?: Edition[];
  currentYear?: string | number | null;
  idSuffix?: string;
  sticky?: boolean;
  compact?: boolean;
}) {
  let years = (editions || []).map((e) => (typeof e === 'number' ? Number(e) : Number((e as any).year))).filter(Boolean);
  // Ensure we include the current year even when no matches exist for it
  const cur = currentYear ? Number(currentYear) : null;
  if (cur && !years.includes(cur)) years.push(cur);
  years = Array.from(new Set(years)).sort((a, b) => b - a);
  if (!years || years.length === 0) return null;

  return (
    <nav id={`server-edition-navigator-${idSuffix}`} aria-label="Editions navigation" className={`w-full mb-6 z-0 ${sticky ? 'md:sticky md:top-24 z-30' : ''}`}>
      <div className="relative flex items-center gap-3">
        <button
          type="button"
          aria-label="Scroll left"
          className="hidden md:inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-gray-200"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 py-3 overflow-x-hidden" role="list">
          <div
            className="grid gap-3 items-start px-1"
            style={{
              gridAutoRows: 'minmax(36px, auto)',
              gridTemplateColumns: `repeat(auto-fill, minmax(${88}px, 1fr))`,
            }}
          >
            {years.map((y) => {
              const selected = String(currentYear) === String(y);
              return (
                <Link
                  key={y}
                  role="listitem"
                  href={slug ? getTourneyHref({ slug, year: y }) : getTourneyHref({ id: id as any, year: y })}
                  title={`Edition ${y}`}
                  aria-current={selected ? 'true' : 'false'}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-base font-black transition-transform transform hover:scale-105 min-w-0 ${selected ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black shadow-2xl transform scale-105 ring-4 ring-yellow-400' : 'bg-gray-700/60 text-gray-200 hover:bg-gray-700/80 shadow-md'} focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500`}
                >
                  <span className="tabular-nums truncate block w-full text-center font-extrabold">{y}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          aria-label="Scroll right"
          className="hidden md:inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-gray-200"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}
