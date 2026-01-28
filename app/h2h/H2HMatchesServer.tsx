import Link from "next/link";
import { Match } from "@/types";
import Flag from '@/components/Flag';
import { getTourneyHref, extractUniqueSurfaces, getPlayerHref } from "@/lib/utils";

interface H2HMatchesServerProps {
  matches: Match[];
  playerId: string;
}

function renderNameWithSeedEntry(
  name: string,
  seed?: number | null,
  entry?: string | null
) {
  const hasSeed = typeof seed === "number" && !Number.isNaN(seed);
  return (
    <>
      {name}
      {hasSeed ? (
        <span className="text-[0.65rem] text-gray-400"> ({seed})</span>
      ) : entry ? (
        <span className="text-[0.65rem] text-gray-400"> ({entry})</span>
      ) : null}
    </>
  );
}

function pct(num?: number | null, den?: number | null, digits = 1) {
  if (!num || !den || den <= 0) return "-";
  const val = (num / den) * 100;
  return Number.isFinite(val) ? `${val.toFixed(digits)}%` : "-";
}

function ratio(num?: number | null, den?: number | null) {
  return `${num ?? 0}/${den ?? 0}`;
}

export default function H2HMatchesServer({
  matches,
  playerId,
}: H2HMatchesServerProps) {
  if (!matches || matches.length === 0) {
    return <p className="text-gray-400 text-sm">No matches found.</p>;
  }

  // Colonne base della tabella
  const baseColumns = [
    { key: "tourney_date", label: "Date", align: "center" },
    { key: "tourney_name", label: "Tourney", align: "left" },
    { key: "surface", label: "Surface", align: "center" },
    { key: "round", label: "Round", align: "center" },
    { key: "winner_rank", label: "Wrk", align: "center" },
    { key: "winner_name", label: "Winner", align: "left" },
    { key: "loser_rank", label: "Lrk", align: "center" },
    { key: "loser_name", label: "Loser", align: "left" },
    { key: "score", label: "Score", align: "center" },
    { key: "best_of", label: "BoF", align: "center" },
    { key: "minutes", label: "Min", align: "center" },
  ];

  // Colonne statistiche (mostriamo quelle del winner)
  const statsColumns = [
    { id: "WA", label: "WA", title: "Winner Aces" },
    { id: "WDF", label: "WDF", title: "Winner Double Faults" },
    { id: "W1stIn", label: "W1stIn", title: "W 1st Serve In %" },
    { id: "W1stPct", label: "W1st%", title: "W 1st Serve Won %" },
    { id: "W2ndPct", label: "W2nd%", title: "W 2nd Serve Won %" },
    { id: "WBPSvd", label: "BPSvd", title: "W Break Points Saved" },
  ];

  return (
    <div className="mt-4 text-gray-100">
      <div className="overflow-x-auto rounded border border-white/20 bg-gray-900/90 shadow-xl">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="bg-black/80">
              {[...baseColumns, ...statsColumns].map((col) => {
                const keyId = "key" in col ? col.key : col.id;
                const colTitle = "title" in col ? (col.title ?? col.label) : col.label;
                const align = "align" in col ? col.align : "center";

                return (
                  <th
                    key={keyId}
                    scope="col"
                    className={`border border-white/20 px-3 py-2 text-${align} font-medium text-gray-200 select-none`}
                    title={colTitle}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {col.label}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {matches.map((m: any, idx) => {
              const isPlayerWinner = m.winner_id === playerId;
              const isPlayerLoser = m.loser_id === playerId;

              // Calcoli per le percentuali
              const w1stInPct = pct(m.w_1stIn, m.w_svpt);
              const w1stWonPct = pct(m.w_1stWon, m.w_1stIn);
              const w2ndWonPct = pct(m.w_2ndWon, m.w_svpt && m.w_1stIn ? m.w_svpt - m.w_1stIn : null);

              return (
                <tr
                  key={m.id || idx}
                  className={`border-b border-white/10 transition-colors ${
                    isPlayerWinner
                      ? "bg-green-900/20"
                      : isPlayerLoser
                      ? "bg-red-900/20"
                      : "hover:bg-gray-800/50"
                  }`}
                >
                  <td className="px-3 py-2 text-center">
                    {m.tourney_date
                      ? new Date(m.tourney_date).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "-"}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={getTourneyHref({ id: m.tourney_id, name: m.tourney_name, year: m.year })}
                      className="text-blue-400 hover:underline"
                    >
                      {m.tourney_name || '-'}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {extractUniqueSurfaces(m.surface).join(', ') || (m.surface ?? "-")}
                  </td>
                  <td className="px-3 py-2 text-center">{m.round || '-'}</td>
                  <td className="px-3 py-2 text-center">{m.winner_rank ?? "-"}</td>
                  <td className="px-3 py-2">
                    <Flag ioc={m.winner_ioc ?? undefined} className="w-4 h-3 inline-block mr-1" />
                    <Link
                      href={getPlayerHref(m.winner_slug ?? String(m.winner_id ?? ''))}
                      className={isPlayerWinner ? "font-bold text-green-400" : "text-gray-100 hover:text-white"}
                    >
                      {renderNameWithSeedEntry(
                        m.winner_name || '',
                        (m as any).winner_seed,
                        (m as any).winner_entry
                      )}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-center">{m.loser_rank ?? "-"}</td>
                  <td className="px-3 py-2">
                    <Flag ioc={m.loser_ioc ?? undefined} className="w-4 h-3 inline-block mr-1" />
                    <Link
                      href={getPlayerHref(m.loser_slug ?? String(m.loser_id ?? ''))}
                      className={isPlayerLoser ? "font-bold text-red-400" : "text-gray-100 hover:text-white"}
                    >
                      {renderNameWithSeedEntry(
                        m.loser_name || '',
                        (m as any).loser_seed,
                        (m as any).loser_entry
                      )}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-center font-medium">{m.score || '-'}</td>
                  <td className="px-3 py-2 text-center">{m.best_of ?? "-"}</td>
                  <td className="px-3 py-2 text-center">{m.minutes ?? "-"}</td>

                  {/* Statistiche Winner */}
                  <td className="px-3 py-2 text-center">{m.w_ace ?? "-"}</td>
                  <td className="px-3 py-2 text-center">{m.w_df ?? "-"}</td>
                  <td className="px-3 py-2 text-center">{w1stInPct}</td>
                  <td className="px-3 py-2 text-center">{w1stWonPct}</td>
                  <td className="px-3 py-2 text-center">{w2ndWonPct}</td>
                  <td className="px-3 py-2 text-center">{ratio(m.w_bpSaved, m.w_bpFaced)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
