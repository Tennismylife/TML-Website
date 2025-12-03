import Link from "next/link";
import { getLevelFullName } from "@/lib/utils";
import { getRoundColor, getTextColorForRound, getSurfaceColor, getLevelColor } from "@/lib/colors";

type TourneyTile = {
  key: string;
  name: string;
  date: Date | string | number; // accept string/number too
  surface: string | null;
  level: string | null;
  tourney_id: string | null;
  matches: number;
  wins: number;
  losses: number;
  bestRound: string;
  champion: boolean;
  year: number;
};

interface TournamentGridProps {
  tourneys: TourneyTile[];
  getTourneyLink: (tourneyId?: string, year?: number) => string;
}

export default function TournamentGrid({ tourneys, getTourneyLink }: TournamentGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {tourneys.map(t => {
        const roundColor = getRoundColor(t.bestRound);
        const roundTextColor = getTextColorForRound(roundColor);
        const surfaceColor = getSurfaceColor(t.surface || "Unknown");
        const levelColor = getLevelColor(t.level || "Unknown");

        // Ensure we have a valid Date object before calling toLocaleDateString
        const dateObj =
          t.date instanceof Date
            ? t.date
            : typeof t.date === "number"
            ? new Date(t.date)
            : new Date(String(t.date));
        const dateStr = Number.isFinite(dateObj.getTime()) ? dateObj.toLocaleDateString("it-IT") : String(t.date ?? "-");

        return (
          <Link
            key={t.key}
            href={getTourneyLink(t.tourney_id, t.year)}
            className="relative block w-full h-full card p-4 flex flex-col hover:-translate-y-1 hover:shadow-xl transition-all duration-300 bg-gray-700/90 rounded-lg"
          >
            {/* Titolo e bestRound */}
            <div className="flex justify-between items-start gap-2">
              <span className="font-semibold truncate">{t.name}</span>

              <span
                className="px-3 py-1 rounded-full text-sm md:text-base font-semibold truncate"
                style={{ backgroundColor: roundColor, color: roundTextColor }}
              >
                {t.bestRound}
              </span>
            </div>

            {/* Data */}
            <div className="mt-2 text-sm text-gray-300">{dateStr}</div>

            {/* Statistiche e badge in basso */}
            <div className="mt-auto flex justify-between items-center text-sm">
              {/* Wins-Losses */}
              <div className="flex items-center gap-3">
                <span className="font-medium">W - L :</span> <span className="font-semibold"> {t.wins}-{t.losses}</span>
              </div>

              {/* Categoria e superficie */}
              <div className="flex gap-1 items-center">
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold truncate"
                  style={{ backgroundColor: levelColor, color: "#fff" }}
                >
                  {getLevelFullName(t.level)}
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold truncate"
                  style={{ backgroundColor: surfaceColor, color: "#000" }}
                >
                  {t.surface || "Unknown"}
                </span>
              </div>
            </div>

            {/* Badge campione */}
            {t.champion && (
              <span className="absolute top-2 right-2 text-yellow-400 font-bold text-lg">🏆</span>
            )}
          </Link>
        );
      })}

      {/* Stato vuoto */}
      {tourneys.length === 0 && (
        <div className="col-span-full p-4 text-center text-gray-400 card bg-gray-700/90 rounded-lg">
          Nessun torneo per questa stagione.
        </div>
      )}
    </div>
  );
}
