"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, ChevronDown } from "lucide-react";
import TournamentSearch from "./TournamentSearch";
import type { Tournament as TournamentDTO, TournamentGroups } from "@/types/tournament";
import { getSurfaceColor } from "@/lib/colors";
import { getTourneyHref } from "@/lib/utils";

const EMPTY: TournamentGroups = { grandSlams: [], masters1000: [], finals: [], olympics: [], others: [] };

// Colori gruppi principali
const GROUP_COLORS: Record<string, string> = {
  grandSlams: "#A855F7",   // violet
  masters1000: "#06B6D4",  // cyan
  finals: "#F43F5E",       // rose
  olympics: "#FACC15",     // yellow
};

const GROUPS = [
  { key: "grandSlams" as const,  title: "Grand Slams" },
  { key: "masters1000" as const, title: "Masters 1000" },
  { key: "finals" as const,      title: "ATP Finals" },
  { key: "olympics" as const,    title: "Olympics" },
] as const;

// Badge riutilizzabile
function Badge({ text, bgColor, textColor }: { text: string; bgColor?: string; textColor?: string }) {
  return (
    <span
      className="px-3 py-1.5 rounded-full font-semibold text-sm md:text-base truncate"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {text}
    </span>
  );
}

export default function TournamentsPage() {
  const [data, setData] = useState<TournamentGroups>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showOthers, setShowOthers] = useState(false);





  // Flat list of all tournaments (useful for suggestions)
  const allTournaments = useMemo(() => [
    ...(data.grandSlams || []),
    ...(data.masters1000 || []),
    ...(data.finals || []),
    ...(data.olympics || []),
    ...(data.others || []),
  ], [data]);

  // Helper: recursively extract all string values from the `name` JSON field
  function extractNames(field: any): string[] {
    if (!field) return [];
    if (typeof field === 'string') return [field];
    if (Array.isArray(field)) return field.flatMap(f => extractNames(f));
    if (typeof field === 'object') return Object.values(field).flatMap(v => extractNames(v));
    return [];
  }



  // Filter data for the main grid (debounced to avoid excessive recalculation)
  const filteredData = useMemo(() => {
    if (!debouncedSearch.trim()) return data;
    const q = debouncedSearch.toLowerCase().trim();
    const filter = (arr: TournamentDTO[]) =>
      arr.filter(t => {
        const names = Array.isArray(t.name) ? t.name.flatMap(n => extractNames(n)) : extractNames(t.name);
        return names.join(' ').toLowerCase().includes(q);
      });
    return {
      grandSlams: filter(data.grandSlams),
      masters1000: filter(data.masters1000),
      finals: filter(data.finals),
      olympics: filter(data.olympics),
      others: filter(data.others),
    };
  }, [data, debouncedSearch]);

  // Fetch data
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/tournaments", { signal: controller.signal, cache: "no-store" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(j => setData(j?.groups ?? EMPTY))
      .catch(() => setData(EMPTY))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);


  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero */}
      <div className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-black to-blue-900" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 text-center px-6 motion-reduce:scale-100 motion-reduce:opacity-100"
        >
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500">
           OPEN ERA TOURNAMENTS
          </h1>
          <p className="mt-2 text-xs text-gray-500">
            (Individual tournaments are identified by the IDs used by the official ATP website)
          </p>
          <p className="mt-4 text-sm text-gray-400">
            Explore records by tournament level:{' '}
            <a href="/records/wins?level=G" className="text-cyan-400 hover:text-cyan-200 underline">Grand Slam</a>
            {' · '}
            <a href="/records/wins?level=M" className="text-cyan-400 hover:text-cyan-200 underline">Masters 1000</a>
            {' · '}
            <a href="/records/wins?level=F" className="text-cyan-400 hover:text-cyan-200 underline">ATP Finals</a>
            {' · '}
            <a href="/records" className="text-cyan-400 hover:text-cyan-200 underline">All Records →</a>
          </p>
        </motion.div>
      </div>

      {/* Search Bar component */}
      <TournamentSearch onDebouncedSearch={(v) => setDebouncedSearch(v)} />

      {/* Tournament grid */}
      <div className="px-6 pb-24">
        {loading ? (
          <SkeletonCompact />
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {GROUPS.map(({ key, title }) => (
              <TournamentGroup
                key={key}
                layoutId={`group-${key}`}
                title={title}
                groupColor={GROUP_COLORS[key]}
                items={filteredData[key]}
                searchActive={!!debouncedSearch}
              />
            ))}

            {/* Toggle Others */}
            <div className="md:col-span-2 mt-4">
              <button
                onClick={() => setShowOthers(v => !v)}
                aria-expanded={showOthers}
                aria-controls="others-section"
                className="w-full p-5 rounded-2xl bg-gray-900/70 border border-gray-800 hover:border-purple-500 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <h3 className="text-xl font-bold">Other Tournaments</h3>
                    <p className="text-sm text-gray-400">ATP 250, 500 and more</p>
                  </div>
                </div>
                <motion.div animate={{ rotate: showOthers ? 180 : 0 }}>
                  <ChevronDown className="w-6 h-6" />
                </motion.div>
              </button>
            </div>

            <AnimatePresence>
              {showOthers && (
                <motion.div
                  id="others-section"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="md:col-span-2 overflow-hidden"
                >
                  <TournamentGroup
                    layoutId="group-others"
                    title="All tournaments for Open Era"
                    groupColor="#888888"
                    items={filteredData.others}
                    searchActive={!!debouncedSearch}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </main>
  );
}

// Tournament group component
function TournamentGroup({
  title,
  items = [],
  searchActive,
  layoutId,
  groupColor,
}: {
  title: string;
  items: TournamentDTO[];
  searchActive: boolean;
  layoutId?: string;
  groupColor?: string;
}) {
  return (
    <motion.section
      layoutId={layoutId}
      layout
      className="relative rounded-2xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all"
    >
      {/* Hero-style background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-black to-blue-900" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

      {/* Content */}
      <div className="relative z-10">
        {/* Solo badge grande per il gruppo */}
        <div className="p-5 border-b border-gray-800 relative z-10 flex justify-between items-center">
          {groupColor && (
            <span
              className="px-4 py-2 rounded-full font-bold text-lg"
              style={{ backgroundColor: groupColor, color: "#fff" }}
            >
              {title}
            </span>
          )}
          <span className="text-xl font-mono text-gray-100">{items.length}</span>
        </div>

        {items.length === 0 ? (
          <div className="p-16 text-center">
            <Globe className="w-16 h-16 mx-auto mb-4 text-gray-200" />
            <p className="text-gray-100 text-lg">
              {searchActive ? "No tournaments found" : "No tournaments in this category"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-800 relative z-10">
            {items.map((t, i) => (
              <motion.li
                key={t.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  href={getTourneyHref({ slug: (t as any).slug ?? undefined, id: t.id })}
                  className="block px-5 py-4 hover:bg-white/5 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-lg text-white">
                      {Array.isArray(t.name) ? t.name[0] : t.name}
                    </span>
                    <div className="flex gap-2">
                      {/* Surfaces (filtered to remove any indoor tokens) */}
                      {(t.surfaces || []).filter(s => !/indoor/i.test(String(s))).map(s => (
                        <Badge
                          key={s}
                          text={s}
                          bgColor={getSurfaceColor(s)}
                          textColor="#000"
                        />
                      ))}
                    </div>
                  </div>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </motion.section>
  );
}

// Skeleton
function SkeletonCompact() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-gray-900/50 border border-gray-800 p-6 space-y-5 animate-pulse"
        >
          <div className="h-2 bg-gray-800 rounded" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-800 rounded-xl" />
            <div className="h-8 w-40 bg-gray-800 rounded" />
          </div>
          <div className="space-y-3">
            <div className="h-6 bg-gray-800 rounded w-full" />
            <div className="h-6 bg-gray-800 rounded w-4/5" />
            <div className="h-6 bg-gray-800 rounded w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
