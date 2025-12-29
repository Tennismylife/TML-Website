"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import TourneyCard from "./TourneyCard";
import SeasonFilters from "./SeasonFilters";

interface TourneyTile {
  key: string;
  extractedId: string;
  surface?: string | null;
  name: string;
  date: string;
  draw_size: string;
  winner_ioc: string;
  winner: string;
  loser_ioc: string;
  loser: string;
  score: string;
  round?: string;
  level?: string;
}

export default function SeasonPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = use(params);
  const [tournaments, setTournaments] = useState<TourneyTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filtered list (now managed by SeasonFilters via onFiltered)
  const [filteredTournaments, setFilteredTournaments] = useState<TourneyTile[]>([]);

  useEffect(() => {
    let isMounted = true; // evita setState su component unmounted

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // fetch verso il tuo endpoint API
        const res = await fetch(`/api/seasons/${year}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = (await res.json()) as TourneyTile[];
        if (isMounted) {
          setTournaments(data);
          setFilteredTournaments(data); // initialize filtered list
        }
      } catch (e: any) {
        if (isMounted) setError(e.message || "Loading error");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [year]);





  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <main className="mx-auto max-w-7xl p-6 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 to-green-600 p-8 rounded-lg mb-8 w-full">
        <h1 className="text-4xl font-bold">Season {year}</h1>
        <p className="text-xl mt-2">Explore the tournaments and matches of {year}</p>



        <div className="mt-4">
          <Link
            href={`/seasons/${year}/records`}
            className="bg-gradient-to-r from-yellow-400 to-green-600 text-white px-5 py-3 rounded-lg hover:from-yellow-500 hover:to-green-700 transition-all duration-300 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            View Records
          </Link>
        </div>
      </div>

      <SeasonFilters
        tournaments={tournaments}
        onFiltered={setFilteredTournaments}
      />

      {filteredTournaments.length === 0 ? (
        <p>No tournaments found for {year}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((t) => (
            <TourneyCard key={t.key} tourney={t} />
          ))}
        </div>
      )}
    </main>
  );
}
