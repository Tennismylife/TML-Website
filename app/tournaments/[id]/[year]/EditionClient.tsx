"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Trophy } from "lucide-react";
import { getTourneyHref } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { Match, SortKey, SortDirection } from "@/types";
import MatchTable from "./EditionMatchesTable";
import EditionHeader from "./EditionHeader";
import Seeds from "./Seeds";

// 👉 NON usare PageProps (in Next.js 15 params è Promise)
type Params = {
  id: string;
  year: string;
};

// ✅ Singolo file client-safe
export default function TournamentEditionClient(props: any) {
  // se Next passa params come Promise, risolvilo dinamicamente
  const [resolvedParams, setResolvedParams] = useState<Params | null>(null);

  useEffect(() => {
    async function resolveParams() {
      if (props?.params instanceof Promise) {
        const p = await props.params;
        setResolvedParams(p);
      } else {
        setResolvedParams(props.params);
      }
    }
    resolveParams();
  }, [props.params]);

  // finché non ho params, non faccio fetch
  const id = resolvedParams?.id ?? "";
  const year = resolvedParams?.year ?? "";
  const router = useRouter();

  // Se l'ID è numerico, richiedi lo slug dal server e sostituisci la rotta mantenendo `year`
  useEffect(() => {
    if (!id || !year) return;
    if (!/^\d+$/.test(id)) return;
    let cancelled = false;
    async function maybeRedirect() {
      try {
        const res = await fetch(`/api/tournaments/${id}/header`);
        if (!res.ok) return;
        const data = await res.json();
        const slug = data?.slug;
        if (slug && !cancelled) {
          const newPath = `/tournaments/${slug}/${encodeURIComponent(year)}`;
          if (typeof window !== 'undefined' && window.location.pathname !== newPath) {
            router.replace(newPath);
          }
        }
      } catch (e) {
        // ignore
      }
    }
    maybeRedirect();
    return () => { cancelled = true; };
  }, [id, year, router]);

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("round");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  useEffect(() => {
    if (!id || !year) return;

    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/tournaments/${id}/${year}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setMatches(data.matches || []);
      } catch (e: any) {
        if (e.name !== "AbortError") setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [id, year]);

  if (!resolvedParams) return <div>Loading parameters...</div>;
  if (loading) return <div>Loading data...</div>;
  if (error) return <div>Error: {error}</div>;
  if (matches.length === 0) return <div>No matches found for {year}.</div>;

  const first = matches[0];

  return (
    <main className="flex flex-col w-full min-h-screen p-4 gap-4">
      <div className="w-full flex justify-start">
        <Link
          href={getTourneyHref({ id: String(first.tourney_id ?? id) })}
          title="Back to tournament"
          aria-label="Back to tournament"
          className="inline-flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold rounded-full shadow-lg hover:scale-105 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to tournament</span>
        </Link>
      </div>

      <EditionHeader
        tourney_name={first.tourney_name ?? ''}
        year={first.year?.toString() ?? year}
        tourney_level={first.tourney_level ?? ''}
        surface={first.surface ?? ''}
        tourney_date={first.tourney_date ? new Date(first.tourney_date).toISOString() : ''}
        draw_size={first.draw_size ?? 0}
      />

      {/* Centered CTA: View Records */}
      <div className="w-full flex justify-center my-6">
        <Link
          href={`${getTourneyHref({ id: String(first.tourney_id ?? id) })}/records`}
          className="group relative inline-flex items-center gap-4 px-10 py-5 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black text-xl rounded-full shadow-2xl hover:shadow-yellow-500/50 transform hover:scale-110 transition-all duration-500 overflow-hidden"
          title="View Records of the Tournament"
          aria-label="View Records of the Tournament"
        >
          <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-1000" />
          <Trophy className="w-8 h-8" />
          <span>View Records of the Tournament</span>
          <ArrowRight className="w-7 h-7 group-hover:translate-x-2 transition-transform" />
        </Link>
      </div>

      <div className="w-full">
        <MatchTable
          matches={matches}
          sortKey={sortKey}
          sortDir={sortDir}
          setSortKey={setSortKey}
          setSortDir={setSortDir}
          playerId=""
        />
      </div>

      <div className="w-full">
        <Seeds id={id} year={year} matches={matches} />
      </div>
    </main>
  );
}
