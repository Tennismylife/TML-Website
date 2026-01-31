import Link from 'next/link';
import { Trophy, ArrowRight } from 'lucide-react';
import Flag from '@/components/Flag';
import EditionNavigator from '@/components/EditionNavigator';
import { getSurfaceColor, getTextColorForRound } from '@/lib/colors';
import { getPlayerHref, getTourneyHref } from '@/lib/utils';
import { playerMatchesUrl } from '../../records/nav';
import { prisma } from '@/lib/prisma';
import { resolveTourneyIds } from '@/lib/tournament';
import EditionNavigatorServer from '@/components/EditionNavigatorServer';

interface Match {
  year: number;
  tourney_id: string;
  tourney_date: Date;
  draw_size: number | null;
  surface: string | null;
  tourney_name: string | null;
  atpCategory?: string | null;
  winner_id: string;
  winner_name: string;
  winner_ioc: string | null;
  loser_id: string;
  loser_name: string;
  loser_ioc: string | null;
  score: string | null;
}

interface TournamentServerProps {
  id: number;
}

export default async function TournamentServer({ id }: TournamentServerProps) {
  // Resolve tournament IDs
  const tourneyIds = (await resolveTourneyIds(String(id))) ?? [String(id)];
  if (tourneyIds.length === 0) {
    return <div>Tournament not found</div>;
  }

  // Fetch finals data
  const tourneyIdFilters = tourneyIds.flatMap((tid: string) => [
    { tourney_id: tid },
    { tourney_id: { endsWith: `-${tid}` } },
  ]);

  const editionsData = await prisma.match.findMany({
    where: {
      OR: tourneyIdFilters,
      round: 'F',
    },
    select: {
      year: true,
      tourney_id: true,
      tourney_date: true,
      draw_size: true,
      surface: true,
      tourney_level: true,
      tourney_name: true,
      winner_id: true,
      winner_name: true,
      winner_ioc: true,
      loser_id: true,
      loser_name: true,
      loser_ioc: true,
      score: true,
    },
    orderBy: { tourney_date: 'desc' },
  });

  // Enrich with atp_category from RankingTable
  const enriched: Match[] = await Promise.all(
    editionsData.map(async (m) => {
      let atpCategory: string | null = m.tourney_level || null;
      try {
        const rt = await prisma.rankingTable.findFirst({
          where: {
            tourney_id: String(m.tourney_id),
            year: String(m.year ?? (m.tourney_date ? new Date(m.tourney_date).getFullYear() : 0)),
          },
          select: { atp_category: true },
        });
        if (rt?.atp_category) atpCategory = rt.atp_category;
      } catch {}

      const year = typeof m.year === 'number'
        ? m.year
        : m.tourney_date
        ? new Date(m.tourney_date).getFullYear()
        : 0;

      const tourney_id = m.tourney_id || '';
      const winner_id = m.winner_id || '';
      const loser_id = m.loser_id || '';
      const tourney_date = m.tourney_date ? new Date(m.tourney_date) : new Date(Date.UTC(year, 0, 1));

      return {
        ...m,
        year,
        tourney_id,
        tourney_date,
        winner_id,
        loser_id,
        atpCategory,
        winner_name: m.winner_name || '',
        loser_name: m.loser_name || '',
      };
    })
  );

  // Map player IDs -> slugs and attach to each edition so links can use slugs when available
  const ids = Array.from(new Set(enriched.flatMap((m) => [m.winner_id, m.loser_id]).filter(Boolean).map(String)));
  const { mapIdsToSlugs } = await import('@/lib/player-slugs');
  const slugMap = await mapIdsToSlugs(ids);
  const enrichedWithSlugs = enriched.map((m) => ({
    ...m,
    winner_slug: slugMap[String(m.winner_id)] ?? null,
    loser_slug: slugMap[String(m.loser_id)] ?? null,
  }));

  const editions = enrichedWithSlugs.sort(
    (a, b) => b.tourney_date.getTime() - a.tourney_date.getTime()
  );

  // Compute server-side full years range for navigator (same logic as edition page)
  let serverEditions: any[] = [];
  try {
    const ids = (await resolveTourneyIds(String(id))) ?? [String(id)];
    if (ids && Array.isArray(ids) && ids.length) {
      const tourneyIdFilters = ids.flatMap((tid: string) => [{ tourney_id: tid }, { tourney_id: { endsWith: `-${tid}` } }]);
      const edRows = await prisma.match.findMany({ where: { OR: tourneyIdFilters }, distinct: ["year"], select: { year: true }, orderBy: { year: 'desc' } });
      const rawYears = edRows.map((e: any) => Number(e.year)).filter(Boolean);
      if (rawYears.length) {
        const minYear = Math.min(...rawYears);
        const maxYear = Math.max(...rawYears);
        for (let y = maxYear; y >= minYear; y--) serverEditions.push({ year: y });
      }
    }
  } catch (e) {
    serverEditions = [];
  }

  // Fetch canonical tournament slug for building slug-based links
  const tournament = await prisma.tournament.findUnique({ where: { id: Number(id) }, select: { slug: true } });
  const canonicalSlug = tournament?.slug ?? null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* CTA Records */}
      <div className="flex justify-center my-12">
        <Link
          href={getTourneyHref({ slug: canonicalSlug, year: undefined }) + "/records"}
          className="group relative inline-flex items-center gap-4 px-10 py-5 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black text-xl rounded-full shadow-2xl hover:shadow-yellow-500/50 transform hover:scale-110 transition-all duration-500 overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-1000" />
          <Trophy className="w-8 h-8" />
          <span>VIEW RECORDS</span>
          <ArrowRight className="w-7 h-7 group-hover:translate-x-2 transition-transform" />
        </Link>
      </div>

      {/* Top server-side navigator (sticky) */}
      <div className="max-w-[84rem] mx-auto px-6 pb-6">
        <EditionNavigatorServer id={String(id)} slug={canonicalSlug} editions={serverEditions} currentYear={editions.length > 0 ? String(editions[0].year) : ''} idSuffix="top" sticky />
      </div>

      {/* Editions navigator (client) */}
      <div className="max-w-[84rem] mx-auto px-6 pb-6">
        <EditionNavigator id={String(id)} slug={canonicalSlug} editions={editions.map(e => ({ year: e.year, tourney_id: e.tourney_id }))} currentYear={editions.length > 0 ? String(editions[0].year) : ''} sticky />
      </div>

      {/* Table of finals */}
      <div className="max-w-[84rem] mx-auto px-6 pb-20 space-y-20">
        <section>
          <div className="overflow-x-auto md:overflow-x-visible rounded bg-gray-900 shadow">
            <table className="min-w-full table-auto border-collapse">
              <colgroup>
                <col />
                <col style={{ width: '15%' }} />
                <col />
                <col />
                <col />
                <col />
                <col />
                <col />
              </colgroup>
              <thead>
                <tr className="bg-black">
                  <th className="px-2 py-2 sm:px-4 sm:py-3 text-center text-sm sm:text-lg text-gray-200">Edition</th>
                  <th className="px-2 py-2 sm:px-4 sm:py-3 text-center text-sm sm:text-lg text-gray-200">Name</th>
                  <th className="px-2 py-2 sm:px-4 sm:py-3 text-center text-sm sm:text-lg text-gray-200">Category</th>
                  <th className="px-2 py-2 sm:px-4 sm:py-3 text-center text-sm sm:text-lg text-gray-200">Surface</th>
                  <th className="px-2 py-2 sm:px-4 sm:py-3 text-center text-sm sm:text-lg text-gray-200">Draw</th>
                  <th className="px-2 py-2 sm:px-4 sm:py-3 text-center text-sm sm:text-lg text-gray-200">Champion</th>
                  <th className="px-2 py-2 sm:px-4 sm:py-3 text-center text-sm sm:text-lg text-gray-200">Finalist</th>
                  <th className="px-2 py-2 sm:px-4 sm:py-3 text-center text-sm sm:text-lg text-gray-200">Score</th>
                </tr>
              </thead>
              <tbody>
                {editions.map((m, idx) => {
                  const isRecent = idx === 0;
                  const editionKey = `${m.tourney_id}-${m.year}-${m.tourney_date.getTime()}-${m.winner_id}-${m.loser_id}-${idx}`;
                  return (
                    <tr key={editionKey} className={`hover:bg-white/5 transition ${isRecent ? 'bg-gradient-to-r from-yellow-500/10 to-amber-500/10' : ''}`}>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-sm sm:text-base">
                        <Link href={getTourneyHref({ slug: canonicalSlug, year: m.year })} className="text-blue-400 hover:underline font-medium">
                          {isRecent && <Trophy className="inline w-5 h-5 mr-1 animate-pulse" />}
                          {m.year}
                        </Link>
                      </td>

                      <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-sm sm:text-base" title={m.tourney_name || ''}>
                        <div className="mx-auto truncate text-center max-w-[7rem] sm:max-w-[10rem]">{m.tourney_name || '–'}</div>
                      </td>

                      <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-sm sm:text-base">{m.atpCategory ?? '–'}</td>

                      <td className="px-6 py-4 sm:px-8 sm:py-6 text-center text-base sm:text-base whitespace-nowrap">
                        {m.surface ? (
                          <span className="text-sm font-medium px-2 py-1 rounded-full shadow-md" style={{ backgroundColor: getSurfaceColor(m.surface) || '#888', color: getTextColorForRound(getSurfaceColor(m.surface) || '#888') }}>{m.surface}</span>
                        ) : (
                          '–'
                        )}
                      </td>
                      <td className="px-6 py-4 sm:px-8 sm:py-6 text-center text-base sm:text-base whitespace-nowrap">{m.draw_size || '–'}</td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-sm sm:text-base"><Link href={playerMatchesUrl((m as any).winner_slug ?? (m as any).winnerSlug ?? String(m.winner_id))} className="inline-flex items-center gap-3 justify-center text-gray-200 hover:text-yellow-400 transition">{m.winner_ioc && <Flag ioc={m.winner_ioc} className="w-6 h-4" />}<span className="font-medium">{m.winner_name}</span></Link></td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-sm sm:text-base"><Link href={playerMatchesUrl((m as any).loser_slug ?? (m as any).loserSlug ?? String(m.loser_id))} className="inline-flex items-center gap-3 justify-center text-gray-400 hover:text-gray-200 transition">{m.loser_ioc && <Flag ioc={m.loser_ioc} className="w-6 h-4" />}<span>{m.loser_name}</span></Link></td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 text-center font-mono tracking-wider text-sm sm:text-base">{m.score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Bottom server-side navigator (compact) */}
      <div className="max-w-[84rem] mx-auto px-6 pt-6">
        <EditionNavigatorServer id={String(id)} slug={canonicalSlug} editions={serverEditions} currentYear={editions.length > 0 ? String(editions[0].year) : ''} idSuffix="bottom" compact />
      </div>
    </main>
  );
}
