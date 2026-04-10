import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { mapIdsToSlugs } from '@/lib/player-slugs';
import { getTourneyHref, getPlayerHref, formatDateISO, createH2HUrl } from '@/lib/utils';
import Flag from '@/components/Flag';

export default async function LatestMatchesServer() {
  let matches: any[] = [];

  try {
    const raw = await prisma.match.findMany({
      orderBy: [{ tourney_date: 'desc' }, { id: 'desc' }],
      where: { score: { not: 'To play' } },
      take: 10,
      select: {
        id: true,
        tourney_name: true,
        tourney_date: true,
        round: true,
        winner_name: true,
        winner_ioc: true,
        loser_name: true,
        loser_ioc: true,
        winner_id: true,
        loser_id: true,
        tourney_id: true,
        year: true,
        score: true,
      },
    });

    const ids = Array.from(
      new Set(
        raw.flatMap((m) => [m.winner_id, m.loser_id])
          .filter((id): id is string => !!id)
          .map(String)
      )
    );
    const slugMap = await mapIdsToSlugs(ids).catch(() => ({} as Record<string, string | null>));

    // tourney slugs
    const tourneyIdParts = Array.from(
      new Set(
        raw.map((m) => {
          const s = String(m.tourney_id || '');
          const parts = s.split('-').filter(Boolean);
          return parts.length === 2 ? parts[1] : s;
        }).filter(Boolean)
      )
    );
    let tourneyMap: Record<string, string | null> = {};
    try {
      if (tourneyIdParts.length > 0) {
        const tours = await prisma.tournament.findMany({
          where: { id: { in: tourneyIdParts.map((v) => Number(v)) } },
          select: { id: true, slug: true },
        });
        tourneyMap = Object.fromEntries(tours.map((t: any) => [String(t.id), t.slug ?? null]));
      }
    } catch {}

    matches = raw.map((m) => {
      const wSlug = m.winner_id ? (slugMap[String(m.winner_id)] ?? null) : null;
      const lSlug = m.loser_id ? (slugMap[String(m.loser_id)] ?? null) : null;
      const s = String(m.tourney_id || '');
      const parts = s.split('-').filter(Boolean);
      const idPart = parts.length === 2 ? parts[1] : s;
      return {
        ...m,
        winner_slug: wSlug,
        loser_slug: lSlug,
        tourney_slug: idPart ? (tourneyMap[String(idPart)] ?? null) : null,
      };
    });
  } catch (err) {
    console.error('LatestMatchesServer error:', err);
  }

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-amber-400">📅</span>
          <h2 className="text-base font-semibold text-gray-100">Latest Matches</h2>
        </div>
        <span className="text-xs text-gray-400">Showing last 10 matches</span>
      </div>

      <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-black">
              {['Date', 'Tournament', 'Round', 'H2H', 'Winner', 'Loser', 'Score'].map((h) => (
                <th key={h} className="border border-white/30 px-3 py-1.5 text-center text-gray-200">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matches.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-4 text-center text-sm text-gray-400">
                  No recent matches available
                </td>
              </tr>
            ) : (
              matches.map((m) => {
                const tourneyId = m.tourney_id ?? null;
                const wSlug = m.winner_slug as string | null;
                const lSlug = m.loser_slug as string | null;

                const h2hHref = (() => {
                  if (wSlug && lSlug) {
                    const [a, b] = wSlug <= lSlug ? [wSlug, lSlug] : [lSlug, wSlug];
                    return `/h2h/${a}-vs-${b}`;
                  }
                  if (m.winner_name && m.loser_name) return createH2HUrl(m.winner_name, m.loser_name);
                  const wId = m.winner_id ? String(m.winner_id) : null;
                  const lId = m.loser_id ? String(m.loser_id) : null;
                  if (wId && lId) {
                    const [a, b] = wId <= lId ? [wId, lId] : [lId, wId];
                    return `/h2h/${a}-vs-${b}`;
                  }
                  return null;
                })();

                return (
                  <tr key={m.id} className="hover:bg-gray-800 border-b border-white/10">
                    {/* Date */}
                    <td className="border border-white/10 px-3 py-1.5 text-center text-gray-200">
                      {m.tourney_date ? formatDateISO(m.tourney_date instanceof Date ? m.tourney_date.toISOString() : String(m.tourney_date)) : '-'}
                    </td>

                    {/* Tournament */}
                    <td className="border border-white/10 px-3 py-1.5 text-center text-gray-200">
                      {m.tourney_name ? (
                        tourneyId ? (
                          <Link
                            href={m.tourney_slug
                              ? getTourneyHref({ slug: m.tourney_slug, year: m.year })
                              : getTourneyHref({ id: tourneyId, year: m.year })}
                            className="text-indigo-300 hover:underline"
                          >
                            {m.tourney_name}
                          </Link>
                        ) : m.tourney_name
                      ) : '-'}
                    </td>

                    {/* Round */}
                    <td className="border border-white/10 px-3 py-1.5 text-center text-gray-200">
                      {m.round || '-'}
                    </td>

                    {/* H2H */}
                    <td className="border border-white/10 px-3 py-1.5 text-center">
                      {h2hHref ? (
                        <Link
                          href={h2hHref}
                          className="inline-block rounded px-1.5 py-0.5 text-[11px] font-bold bg-yellow-500/15 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30 transition-colors whitespace-nowrap"
                        >
                          H2H
                        </Link>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>

                    {/* Winner */}
                    <td className="border border-white/10 px-3 py-1.5 text-center text-gray-200">
                      <div className="flex items-center justify-center gap-2">
                        {m.winner_ioc && <Flag ioc={m.winner_ioc} className="w-4 h-3" />}
                        {m.winner_name ? (
                          <Link
                            href={getPlayerHref(wSlug ?? String(m.winner_id || m.winner_name))}
                            className="text-indigo-300 hover:underline"
                          >
                            {m.winner_name}
                          </Link>
                        ) : '-'}
                      </div>
                    </td>

                    {/* Loser */}
                    <td className="border border-white/10 px-3 py-1.5 text-center text-gray-200">
                      <div className="flex items-center justify-center gap-2">
                        {m.loser_ioc && <Flag ioc={m.loser_ioc} className="w-4 h-3" />}
                        {m.loser_name ? (
                          <Link
                            href={getPlayerHref(lSlug ?? String(m.loser_id || m.loser_name))}
                            className="text-indigo-300 hover:underline"
                          >
                            {m.loser_name}
                          </Link>
                        ) : '-'}
                      </div>
                    </td>

                    {/* Score */}
                    <td className="border border-white/10 px-3 py-1.5 text-center text-gray-200">
                      {m.score || '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
