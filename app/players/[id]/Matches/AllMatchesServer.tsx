import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Flag from "@/components/Flag";
import { getPlayerHref, getPlayerHrefWithTab, getTourneyHref, formatDateISO } from "@/lib/utils";

interface AllMatchesServerProps {
  playerId: string;
  playerSlug?: string | null;
  matches: any[];
  heading?: string;
  playerLinkTab?: string;
}

export default function AllMatchesServer({ playerId, playerSlug, matches, heading, playerLinkTab = 'matches' }: AllMatchesServerProps) {
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
  const surfaceLabel = playerLinkTab && playerLinkTab !== 'matches'
    ? `${playerLinkTab.charAt(0).toUpperCase()}${playerLinkTab.slice(1)}`
    : '';
  const title = surfaceLabel ? `Last 10 ${surfaceLabel} Matches` : `Last ${displayMatches.length} Matches`;

  return (
    <div className="w-full">
      {/* Server-rendered table: visible immediately on first load; hidden by AllMatches once the client mounts */}
      <div id="server-all-matches" className="w-full bg-gray-900/80 rounded-md p-4" suppressHydrationWarning>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xl font-bold" style={{ color: '#facc15' }}>{title}</h3>
          {playerSlug && (
            <Link
              href={
                playerLinkTab && playerLinkTab !== 'matches'
                  ? `${getPlayerHref(playerSlug)}?surface=${playerLinkTab.charAt(0).toUpperCase() + playerLinkTab.slice(1)}`
                  : `${getPlayerHref(playerSlug)}/matches`
              }
              className="inline-block bg-blue-600 hover:bg-blue-700 shadow-lg text-white font-bold text-sm py-1.5 px-4 rounded-full transition-all duration-200 ml-auto"
            >
              View All Matches ↗
            </Link>
          )}
        </div>

        <div className="overflow-x-auto rounded border border-white/20 bg-gray-900 shadow">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-black/80">
                <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Date</th>
                <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Tournament</th>
                <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Surface</th>
                <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Round</th>
                <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Wrk</th>
                <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Winner</th>
                <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Lrk</th>
                <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Loser</th>
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
                    <td className="border border-white/10 px-3 py-2 text-center text-gray-200">
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
                    <td className="border border-white/10 px-3 py-2 text-center text-gray-200">
                      {m.winner_rank != null && m.winner_slug
                        ? <Link href={`/players/${m.winner_slug}/ranking`} className="hover:underline">{m.winner_rank}</Link>
                        : m.winner_rank ?? "-"}
                    </td>
                    <td className="border border-white/10 px-3 py-2 text-center text-gray-200">
                      <div className="flex items-center justify-center gap-2">
                        {m.winner_ioc && <Flag ioc={m.winner_ioc} className="w-6 h-4" />}
                        {m.winner_slug || m.winner_id ? (
                          <Link href={getPlayerHrefWithTab(m.winner_slug ?? String(m.winner_id), playerLinkTab === 'matches' ? null : playerLinkTab)} className="text-gray-200 hover:text-yellow-400">
                            {m.winner_name ?? ""}
                          </Link>
                        ) : (
                          m.winner_name ?? ""
                        )}
                      </div>
                    </td>
                    <td className="border border-white/10 px-3 py-2 text-center text-gray-200">
                      {m.loser_rank != null && m.loser_slug
                        ? <Link href={`/players/${m.loser_slug}/ranking`} className="hover:underline">{m.loser_rank}</Link>
                        : m.loser_rank ?? "-"}
                    </td>
                    <td className="border border-white/10 px-3 py-2 text-center text-gray-200">
                      <div className="flex items-center justify-center gap-2">
                        {m.loser_ioc && <Flag ioc={m.loser_ioc} className="w-6 h-4" />}
                        {m.loser_slug || m.loser_id ? (
                          <Link href={getPlayerHrefWithTab(m.loser_slug ?? String(m.loser_id), playerLinkTab === 'matches' ? null : playerLinkTab)} className="text-gray-400 hover:text-gray-200">
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
