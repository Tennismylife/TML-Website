"use client";

import { useState, useEffect } from "react";
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
export default function TournamentEditionPage(props: any) {
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
      <EditionHeader
        tourney_name={first.tourney_name}
        year={first.year.toString()}
        tourney_level={first.tourney_level}
        surface={first.surface}
        tourney_date={new Date(first.tourney_date).toISOString()}
        draw_size={first.draw_size}
      />

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
