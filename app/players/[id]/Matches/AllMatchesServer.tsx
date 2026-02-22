import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Flag from "@/components/Flag";
import { getPlayerHref, getPlayerHrefWithTab, getTourneyHref, formatDateISO } from "@/lib/utils";

interface AllMatchesServerProps {
  playerId: string;
  matches: any[];
  heading?: string;
}

export default function AllMatchesServer({ playerId, matches, heading }: AllMatchesServerProps) {
  if (!matches || matches.length === 0) {
    return (
      <div id="server-all-matches" className="w-full p-4 text-center text-gray-400">
        No matches found.
      </div>
    );
  }

  // Compute W-L for display
  let wins = 0;
  let losses = 0;
  matches.forEach((m) => {
    if (!m.status) return;
    if (String(m.winner_id) === String(playerId)) wins++;
    else if (String(m.loser_id) === String(playerId)) losses++;
  });
  const winPercentage = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(2) : "0.00";

  // Show only latest 10 matches in SSR
  const displayMatches = matches.slice(0, 10);

  return (
    <div className="w-full">
      {/* Server-rendered table: visible immediately on first load; hidden by AllMatches once the client mounts */}
      <div id="server-all-matches" className="w-full bg-gray-900/80 rounded-md p-4" suppressHydrationWarning>
        <div className="w-full text-center mb-4">
          <div className="font-semibold text-xl sm:text-2xl leading-none text-gray-100">
            W-L: {wins}-{losses} ({winPercentage}%)
          </div>
        </div>

        <div className="overflow-x-auto rounded border border-white/20 bg-gray-900 shadow">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-black/80">
                <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Date</th>
                <th className="border border-white/20 px-3 py-2 text-left font-medium text-gray-200">Tournament</th>
                <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Surface</th>
                <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Round</th>
                <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Wrk</th>
                <th className="border border-white/20 px-3 py-2 text-left font-medium text-gray-200">Winner</th>
                <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Lrk</th>
                <th className="border border-white/20 px-3 py-2 text-left font-medium text-gray-200">Loser</th>
                <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Score</th>
              </tr>
            </thead>
            <tbody>
              {displayMatches.map((m, idx) => {
                const isWinner = String(m.winner_id) === String(playerId);
                return (
                  <tr key={idx} className="hover:bg-gray-800/50">
                    <td className="border border-white/10 px-3 py-2 text-center text-gray-200">
                      {formatDateISO(m.tourney_date)}
                    </td>
                    <td className="border border-white/10 px-3 py-2 text-gray-200">
                      {m.tourney_name ? (
                        m.tourney_id ? (
                          <Link href={getTourneyHref({ slug: (m as any).tourney_slug ?? undefined, id: m.tourney_id, year: m.year })} className="text-indigo-300 hover:underline">
                            {m.tourney_name}
                          </Link>
                        ) : (
                          m.tourney_name
                        )
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="border border-white/10 px-3 py-2 text-center text-gray-200">{m.surface ?? "-"}</td>
                    <td className="border border-white/10 px-3 py-2 text-center text-gray-200">{m.round ?? "-"}</td>
                    <td className="border border-white/10 px-3 py-2 text-center text-gray-200">{m.winner_rank ?? "-"}</td>
                    <td className="border border-white/10 px-3 py-2 text-gray-200">
                      <div className="flex items-center gap-2">
                        {m.winner_ioc && <Flag ioc={m.winner_ioc} className="w-6 h-4" />}
                        {m.winner_slug || m.winner_id ? (
                          <Link href={getPlayerHrefWithTab(m.winner_slug ?? String(m.winner_id), 'matches')} className="text-gray-200 hover:text-yellow-400">
                            {m.winner_name ?? ""}
                          </Link>
                        ) : (
                          m.winner_name ?? ""
                        )}
                      </div>
                    </td>
                    <td className="border border-white/10 px-3 py-2 text-center text-gray-200">{m.loser_rank ?? "-"}</td>
                    <td className="border border-white/10 px-3 py-2 text-gray-200">
                      <div className="flex items-center gap-2">
                        {m.loser_ioc && <Flag ioc={m.loser_ioc} className="w-6 h-4" />}
                        {m.loser_slug || m.loser_id ? (
                          <Link href={getPlayerHrefWithTab(m.loser_slug ?? String(m.loser_id), 'matches')} className="text-gray-400 hover:text-gray-200">
                            {m.loser_name ?? ""}
                          </Link>
                        ) : (
                          m.loser_name ?? ""
                        )}
                      </div>
                    </td>
                    <td className="border border-white/10 px-3 py-2 text-center font-mono text-gray-200">{m.score ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
