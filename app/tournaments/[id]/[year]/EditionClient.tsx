"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Trophy } from "lucide-react";
import { getTourneyHref } from "@/lib/utils";
import { useRouter } from "next/navigation";
import EditionNavigator from '@/components/EditionNavigator';
import type { Match, SortKey, SortDirection } from "@/types";
import MatchTable from "./EditionMatchesTable";
import EditionHeader from "./EditionHeader";
import Seeds from "./Seeds";
import EditionAggregateStatsServer from "./EditionAggregateStatsServer";

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
        if (!id || !year) return;
        const res = await fetch(`/api/tournaments/${id}/header`);
        if (res.status === 404) return; // no header -> nothing to do
        if (!res.ok) return; // transient error -> ignore redirect
        const data = await res.json();
        const slug = data?.slug;
        if (slug && !cancelled) {
          const newPath = `/tournaments/${slug}/${encodeURIComponent(year)}`;
          if (typeof window !== 'undefined' && window.location.pathname !== newPath) {
            router.replace(newPath);
          }
        }
      } catch (e) {
        // ignore transient fetch errors
      }
    }
    maybeRedirect();
    return () => { cancelled = true; };
  }, [id, year, router]);

  // Fetch header to obtain the list of editions and show the navigator
  const [editionsList, setEditionsList] = useState<any[]>([]);
  const [slug, setSlug] = useState<string | null>(null);
  // Fallback tournament info when there are no matches yet
  const [headerInfo, setHeaderInfo] = useState<{ name?: string; surfaces?: string[]; category?: string[] } | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function loadHeader() {
      if (!id) return;
      try {
        const res = await fetch(`/api/tournaments/${id}/header`);
        if (!res.ok) return;
        const d = await res.json();
        if (!cancelled) {
          // Normalize editions coming from /api/tournaments/:id/header — it may be an array of numbers or objects
          const raw = d.editions || [];
          const normalized = Array.isArray(raw) ? raw.map((x: any) => (typeof x === 'number' ? { year: x } : (x && x.year ? x : { year: x }))) : [];
          setEditionsList(normalized);
          setSlug(d.slug || null);
          setHeaderInfo({ name: d.name, surfaces: d.surfaces, category: d.category });
        }
      } catch (e) {
        // ignore
      }
    }
    loadHeader();
    return () => { cancelled = true; };
  }, [id]);

  // Support `initialMatches` passed from the server for SSR.
  // If `initialMatches` are provided, use them and skip the client fetch.
  const [matches, setMatches] = useState<Match[]>(props?.initialMatches ?? []);
  const [loading, setLoading] = useState<boolean>(!props?.initialMatches);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("round");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [mounted] = useState<boolean>(true);

  useEffect(() => {
    if (props?.initialMatches) return; // already have initial data from SSR
    if (!id || !year) return;

    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/tournaments/${id}/${year}`, {
          signal: controller.signal,
        });
        if (res.status === 404) {
          // No matches found for this edition — render layout with empty table
          setMatches([]);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setMatches(data.matches || []);
      } catch (e: any) {
        if (e.name !== "AbortError") setError(e.message || 'Failed to load matches');
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [id, year, props?.initialMatches]);

  if (!resolvedParams) return <div>Loading parameters...</div>;
  if (loading) return <div>Loading data...</div>;

  const first = matches.length > 0 ? matches[0] : null;

  // Determine display values: prefer live match data, fall back to header API info
  const displayName = first?.tourney_name ?? headerInfo?.name ?? '';
  const displayLevel = first?.tourney_level ?? (headerInfo?.category?.[0] ?? '');
  const displaySurface = first?.surface ?? (headerInfo?.surfaces?.[0] ?? '');
  const displayDate = first?.tourney_date ? new Date(first.tourney_date).toISOString() : '';
  const displayDrawSize = first?.draw_size ?? 0;
  const recordsHref = slug
    ? `${getTourneyHref({ slug })}/records`
    : first
      ? `${getTourneyHref({ id: String(first.tourney_id ?? id) })}/records`
      : `/tournaments/${id}/records`;
  const backHref = slug
    ? getTourneyHref({ slug })
    : first
      ? getTourneyHref({ id: String(first.tourney_id ?? id) })
      : `/tournaments/${id}`;

  return (
    <main className="flex flex-col w-full min-h-screen p-4 gap-4">
      <div className="w-full flex justify-start">
        <Link
          href={backHref}
          title="Back to tournament"
          aria-label="Back to tournament"
          className="inline-flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold rounded-full shadow-lg hover:scale-105 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to tournament</span>
        </Link>
      </div>

      <EditionHeader
        tourney_name={displayName}
        year={first?.year?.toString() ?? year}
        tourney_level={displayLevel}
        surface={displaySurface}
        tourney_date={displayDate}
        draw_size={displayDrawSize}
      />

      {/* Centered CTA: View Records */}
      <div className="w-full flex justify-center my-6">
        <Link
          href={recordsHref}
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

      <div className="w-full max-w-7xl mx-auto px-0 mt-4">
        <EditionNavigator id={id} slug={slug} editions={editionsList} currentYear={year} />
      </div>

      <div className="w-full">
        {matches.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No matches recorded yet for {year}.</p>
        ) : mounted ? (
          <MatchTable
            matches={matches}
            sortKey={sortKey}
            sortDir={sortDir}
            setSortKey={setSortKey}
            setSortDir={setSortDir}
            playerId=""
          />
        ) : null}
      </div>

      {matches.length > 0 && (
        <div className="w-full">
          <Seeds id={id} year={year} matches={matches} />
        </div>
      )}

      {matches.length > 0 && (
        <EditionAggregateStatsServer
          matches={matches}
          tournamentName={displayName}
          year={first?.year?.toString() ?? year}
        />
      )}

      <div className="w-full max-w-7xl mx-auto px-0 mt-4">
        <EditionNavigator id={id} slug={slug} editions={editionsList} currentYear={year} />
      </div>
    </main>
  );
}
