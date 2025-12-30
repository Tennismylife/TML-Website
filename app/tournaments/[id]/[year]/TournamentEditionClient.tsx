"use client";

import { useState } from "react";
import type { Match, SortKey, SortDirection } from "@/types";
import MatchTable from "./EditionMatchesTable";
import EditionHeader from "./EditionHeader";
import Seeds from "./Seeds";

type TournamentEditionClientProps = {
  id: string;
  year: string;
  initialMatches: Match[];
  tournamentName: string;
  startDate: Date | string | null;
  location: string;
};

export default function TournamentEditionClient({
  id,
  year,
  initialMatches,
  tournamentName,
  startDate,
  location,
}: TournamentEditionClientProps) {
  const [matches] = useState<Match[]>(initialMatches);
  const [sortKey, setSortKey] = useState<SortKey>("round");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  if (matches.length === 0) {
    return <div>No matches found for {year}.</div>;
  }

  const first = matches[0];

  return (
    <main className="flex flex-col w-full min-h-screen p-4 gap-4">
      <EditionHeader
        tourney_name={first.tourney_name || tournamentName}
        year={first.year?.toString() || year}
        tourney_level={first.tourney_level}
        surface={first.surface}
        tourney_date={startDate ? new Date(startDate).toISOString() : new Date().toISOString()}
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