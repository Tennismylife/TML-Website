"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Globe, ChevronDown } from "lucide-react";
import type { Tournament as TournamentDTO, TournamentGroups } from "@/types/tournament";
import { getSurfaceColor } from "@/lib/colors";

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
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showOthers, setShowOthers] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [search]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!debouncedSearch.trim()) return data;
    const q = debouncedSearch.toLowerCase().trim();
    const filter = (arr: TournamentDTO[]) =>
      arr.filter(t =>
        (Array.isArray(t.name) ? t.name.join(" ") : t.name || "")
          .toLowerCase()
          .includes(q)
      );
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

  // Cmd+K / Ctrl+K focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("tournament-search")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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
            ATP TOUR
          </h1>
          <p className="mt-4 text-lg md:text-xl text-gray-300">
            All the official ATP tournaments in one place.
          </p>
        </motion.div>
      </div>

      {/* Search Bar */}
      <div className="sticky top-4 z-50 px-6 -mt-20 mb-12">
        <motion.div initial={{ y: -50 }} animate={{ y: 0 }} className="max-w-2xl mx-auto">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="tournament-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tournament... (Cmd+K)"
              aria-label="Search tournaments"
              className="w-full pl-14 pr-12 py-4 rounded-2xl bg-gray-900/90 backdrop-blur-xl border border-gray-800 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:shadow-lg focus:shadow-cyan-500/20 transition-all text-lg"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Tournament grid */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
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
                  href={`/tournaments/${t.id}`}
                  className="block px-5 py-4 hover:bg-white/5 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-lg text-white">
                      {Array.isArray(t.name) ? t.name[0] : t.name}
                    </span>
                    <div className="flex gap-2">
                      {(t.surfaces || []).map(s => (
                        <Badge
                          key={s}
                          text={s}
                          bgColor={getSurfaceColor(s)}
                          textColor="#000"
                        />
                      ))}
                      {t.indoor && <Badge text="Indoor" bgColor="#444" textColor="#fff" />}
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
