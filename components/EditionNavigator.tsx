"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";

type Edition = { year: number; tourney_id?: string | number };

import { getTourneyHref } from '@/lib/utils';

export default function EditionNavigator({
  id,
  slug = null,
  editions = [],
  currentYear,
  sticky = false,
  compact = false,
}: {
  id: string | number;
  slug?: string | null;
  editions?: Edition[];
  currentYear?: string | number | null;
  sticky?: boolean;
  compact?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const years = useMemo(() => {
    const arr = (editions || []).map((e) => (typeof e === 'number' ? Number(e) : Number((e as any).year))).filter(Boolean);
    // Ensure the currentYear is present even if there are no matches for it
    const cur = currentYear ? Number(currentYear) : null;
    if (cur && !arr.includes(cur)) arr.push(cur);
    const uniq = Array.from(new Set(arr)).sort((a, b) => b - a);
    return uniq;
  }, [editions, currentYear]);

  const scroll = (dir: "left" | "right") => {
    const el = containerRef.current;
    if (!el) return;
    // Scroll di una "pagina": larghezza visibile del contenitore
    const amount = el.clientWidth;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  // Nascondi eventuali navigator server-side (entrambi top/bottom) se esistono per evitare duplicati quando il client monta
  useEffect(() => {
    try {
      const serverNavs = document.querySelectorAll("[id^='server-edition-navigator']");
      serverNavs.forEach((el) => { (el as HTMLElement).style.display = 'none'; });
    } catch (e) {
      // ignore
    }
  }, []);

  if (!years || years.length === 0) return null;

  // Parametri di layout
  const MAX_ROWS = 8; // massimo righe desiderate (puoi cambiarlo o trasformarlo in prop)
  const minColumnWidth = compact ? 64 : 88; // larghezza minima per colonna (px)

  // Impostazioni per altezza riga / gaps
  const rowHeight = compact ? 32 : 40; // px per riga
  const gapPx = 12; // corrisponde a gap-3 (0.75rem ≈ 12px)
  const paddingVertical = compact ? 12 : 20; // py-2 => 10px + 10px

  // Altezza massima del container calcolata in base alle righe massime (usata solo se serve)
  const maxHeightPx = MAX_ROWS * rowHeight + (MAX_ROWS - 1) * gapPx + paddingVertical; // altezza del container (limite)

  return (
    <nav aria-label="Editions navigation" className={`w-full mb-6 z-0 ${sticky ? 'md:sticky md:top-24 z-30' : ''}`}>
      <div className="relative flex items-center gap-3">
        <button
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="hidden md:inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-gray-200"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div
          ref={containerRef}
          className="flex-1 overflow-x-hidden py-3"
          role="list"
        >
          {/* Grid: same layout across breakpoints (no special mobile layout) */}
          <div
            className="grid gap-3 items-start px-1"
            style={{
              gridAutoRows: compact ? 'minmax(28px, auto)' : 'minmax(36px, auto)',
              gridTemplateColumns: `repeat(auto-fill, minmax(${minColumnWidth}px, 1fr))`,
            }}
          >
            {years.map((y) => {
              // Evidenzia l'edizione corrente (se corrisponde a currentYear)
              const selected = String(currentYear) === String(y);
              return (
                <Link
                  key={y}
                  role="listitem"
                  href={slug ? getTourneyHref({ slug, year: y }) : getTourneyHref({ id: id as any, year: y })}
                  title={`Edition ${y}`}
                  aria-current={selected ? 'true' : 'false'}
                  className={`inline-flex items-center justify-center gap-2 ${compact ? 'px-2 py-1 text-sm' : 'px-4 py-2 text-base'} rounded-full font-black transition-transform transform hover:scale-105 min-w-0 ${selected ? (compact ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black shadow-2xl transform scale-105 ring-2 ring-yellow-400' : 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black shadow-2xl transform scale-105 ring-4 ring-yellow-400') : 'bg-gray-700/60 text-gray-200 hover:bg-gray-700/80 shadow-md'} focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500`}
                >
                  <span className="tabular-nums truncate block w-full text-center font-extrabold">{y}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="hidden md:inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-gray-200"
        >
          <ChevronRight className="w-5 h-5" />
        </button>


      </div>
    </nav>
  );
}
