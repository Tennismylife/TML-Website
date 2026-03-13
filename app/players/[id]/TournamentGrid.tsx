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
  tourney_slug?: string | null;
  matches: number;
  wins: number;
  losses: number;
  bestRound: string;
  champion: boolean;
  year: number;
};

interface TournamentGridProps {
  tourneys: TourneyTile[];
  // Accept either a tourney slug (preferred) OR a tourney id as fallback. Signature: (slug?, id?, year?)
  getTourneyLink: (tourneySlug?: string, tourneyId?: string, year?: number) => string;
}

export default function TournamentGrid({ tourneys, getTourneyLink }: TournamentGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {tourneys.map(t => {
        const roundColor = getRoundColor(t.bestRound);
        const roundTextColor = getTextColorForRound(roundColor);
        const surfaceColor = getSurfaceColor(t.surface || "Unknown");
        const levelColor = getLevelColor(t.level || "Unknown");

        // Render as a link when either slug or id is present; prefer slug but fallback to id for clickability
        if (t.tourney_slug || t.tourney_id) {
          return (
            <Link
              key={t.key}
              href={getTourneyLink(t.tourney_slug ?? undefined, t.tourney_id ?? undefined, t.year)}
              className="relative block w-full h-full card p-4 flex flex-col cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all duration-300 bg-gray-700/90 rounded-lg"
              style={{ cursor: 'pointer' }}
            >
              {/* Titolo, anno e bestRound */}
              <div className="flex justify-between items-start gap-2 mb-4">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="font-semibold truncate">{t.name}</span>
                  <span className="font-semibold text-gray-400 shrink-0">{t.year}</span>
                </div>
                <span
                  className="px-3 py-1 rounded-full text-sm md:text-base font-semibold shrink-0"
                  style={{ backgroundColor: roundColor, color: roundTextColor }}
                >
                  {t.bestRound}
                </span>
              </div>

              {/* Statistiche e badge in basso */}
              <div className="mt-auto flex justify-between items-center gap-x-2 gap-y-1 flex-wrap text-sm">
                {/* Wins-Losses */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-medium">W - L :</span>
                  <span className="font-semibold">{t.wins}-{t.losses}</span>
                </div>

                {/* Categoria e superficie */}
                <div className="flex gap-1.5 items-center justify-end flex-wrap">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
                    style={{ backgroundColor: levelColor, color: "#fff" }}
                  >
                    {getLevelFullName(t.level)}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
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
        }

        // Neither slug nor id available -> render non-clickable card and warn in console for dev visibility
        console.warn("Tournament slug and id missing for tourney:", t.key, t.name, t.tourney_id);
        return (
          <div
            key={t.key}
            className="relative block w-full h-full card p-4 flex flex-col bg-gray-700/60 rounded-lg opacity-80 cursor-default"
            title="Slug torneo non disponibile"
          >
            <div className="flex justify-between items-start gap-2 mb-4">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="font-semibold truncate">{t.name}</span>
                <span className="font-semibold text-gray-400 shrink-0">{t.year}</span>
              </div>
              <span
                className="px-3 py-1 rounded-full text-sm md:text-base font-semibold shrink-0"
                style={{ backgroundColor: roundColor, color: roundTextColor }}
              >
                {t.bestRound}
              </span>
            </div>

            <div className="mt-auto flex justify-between items-center gap-x-2 gap-y-1 flex-wrap text-sm">
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-medium">W - L :</span>
                <span className="font-semibold">{t.wins}-{t.losses}</span>
              </div>

              <div className="flex gap-1.5 items-center justify-end flex-wrap">
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
                  style={{ backgroundColor: levelColor, color: "#fff" }}
                >
                  {getLevelFullName(t.level)}
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
                  style={{ backgroundColor: surfaceColor, color: "#000" }}
                >
                  {t.surface || "Unknown"}
                </span>
              </div>
            </div>

            {t.champion && (
              <span className="absolute top-2 right-2 text-yellow-400 font-bold text-lg">🏆</span>
            )}
          </div>
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
