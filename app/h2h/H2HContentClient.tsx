"use client";

import { useState, useMemo } from "react";
import H2HPageFilters from "./H2HPageFilters";
import H2HBars from "./H2HBars";
import H2HMatches from "./H2HMatches";
import H2HHeaderServer from "./H2HHeaderServer";
import PlayerSearch from "./PlayerSearch";
import { useRouter } from "next/navigation";
import { createH2HUrl } from "@/lib/utils";
import { Match, SortKey, SortDirection } from "@/types";

interface Player {
  id: string;
  atpname: string | null;
  ioc?: string | null;
}

interface H2HContentClientProps {
  matches: Match[];
  player1: Player;
  player2: Player;
}

export default function H2HContentClient({ matches, player1, player2 }: H2HContentClientProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("tourney_date");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [filters, setFilters] = useState({
    year: "All" as number | "All",
    level: "All",
    surface: "All",
    round: "All",
    tourney_name: "All",
  });

  // Filtra i match in base ai filtri selezionati
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (filters.year !== "All" && m.year !== filters.year) return false;
      if (filters.level !== "All" && m.tourney_level !== filters.level) return false;
      if (filters.surface !== "All" && m.surface !== filters.surface) return false;
      if (filters.round !== "All" && m.round !== filters.round) return false;
      if (filters.tourney_name !== "All" && m.tourney_name !== filters.tourney_name) return false;
      return true;
    });
  }, [matches, filters]);

  // Calcola statistiche dai match filtrati
  const stats = useMemo(() => {
    let wins1 = 0;
    let wins2 = 0;
    filteredMatches.forEach((m: any) => {
      if (m.winner_name === player1.atpname) wins1++;
      if (m.winner_name === player2.atpname) wins2++;
    });
    const totalMatches = wins1 + wins2;
    const perc1 = totalMatches > 0 ? (wins1 / totalMatches) * 100 : 0;
    const perc2 = totalMatches > 0 ? (wins2 / totalMatches) * 100 : 0;
    return { wins1, wins2, perc1, perc2 };
  }, [filteredMatches, player1.atpname, player2.atpname]);

  return (
    <div className="space-y-8">
      {/* Barre di ricerca per selezionare i giocatori */}
      <div className="flex flex-col md:flex-row gap-4">
        <PlayerSearch 
          label="Player 1" 
          onSelect={(p) => {
            if (player2.atpname) {
              const url = createH2HUrl(p.atpname ?? '', player2.atpname);
              router.push(url);
            }
          }}
          initialPlayer={player1}
        />
        <PlayerSearch 
          label="Player 2" 
          onSelect={(p) => {
            if (player1.atpname) {
              const url = createH2HUrl(player1.atpname, p.atpname ?? '');
              router.push(url);
            }
          }}
          initialPlayer={player2}
        />
      </div>

      {/* Header con statistiche */}
      <H2HHeaderServer
        wins1={stats.wins1}
        wins2={stats.wins2}
        perc1={stats.perc1}
        perc2={stats.perc2}
        player1={player1}
        player2={player2}
        matches={filteredMatches}
      />

      {/* Filtri */}
      <H2HPageFilters
        allMatches={matches}
        loading={false}
        error={null}
        filters={filters}
        setFilters={(newFilters) => setFilters({ ...filters, ...newFilters })}
      />

      {/* Match History */}
      <div>
        <H2HMatches
          matches={filteredMatches}
          sortKey={sortKey}
          sortDir={sortDir}
          setSortKey={setSortKey}
          setSortDir={setSortDir}
          playerId={player1.id}
        />
      </div>

      {/* Wins / Sets / Games - 3 colonne affiancate */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonna Wins */}
        <div>
          <h3 className="text-xl font-bold mb-4 text-center">Wins</h3>
          <H2HBars
            matches={filteredMatches}
            player1={player1}
            player2={player2}
            category="wins"
          />
        </div>

        {/* Colonna Sets */}
        <div>
          <h3 className="text-xl font-bold mb-4 text-center">Sets</h3>
          <H2HBars
            matches={filteredMatches}
            player1={player1}
            player2={player2}
            category="sets"
          />
        </div>

        {/* Colonna Games */}
        <div>
          <h3 className="text-xl font-bold mb-4 text-center">Games</h3>
          <H2HBars
            matches={filteredMatches}
            player1={player1}
            player2={player2}
            category="games"
          />
        </div>
      </div>
    </div>
  );
}
