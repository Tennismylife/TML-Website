import React from 'react';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import Flag from '@/components/Flag';
import DropdownNavSelect from '@/components/DropdownNavSelect';
import ServerPagination from '@/components/ServerPagination';

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const top = Number((Array.isArray(sp.top) ? sp.top[0] : sp.top) ?? 2);
  const page = Number((sp.page as string) ?? '1');
  const SITE = 'https://stats.tennismylife.org';
  const OG_IMAGE = `${SITE}/og/site-preview.png`;
  const title = `Longest Consecutive Weeks in ATP Top ${top} – All-Time`;
  const description = `Which players stayed inside the ATP Top ${top} for the most consecutive weeks? Complete all-time streak records.`;
  const canonical = `${SITE}/recordsranking/streak/consecutiveweeksattop/${top}`;
  return {
    title,
    description,
    keywords: [`consecutive weeks ATP Top ${top}`, 'ATP streak Top 10', 'longest streak Top 10', 'consecutive weeks Top 10', 'ATP history', 'tennis records'],
    alternates: { canonical },
    openGraph: { type: 'website', url: canonical, siteName: 'TennisMyLife', title, description, images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title, description, images: [OG_IMAGE] },
    robots: page > 1 ? { index: false, follow: true } : { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
    authors: [{ name: 'TennisMyLife' }],
  };
}

function formatDate(d: Date) { return d.toISOString().slice(0,10); }

export default async function StreakTop({ searchParams }: { searchParams?: Promise<Record<string,string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const top = Number((sp.top as string) ?? 2);
  const perPage = 20;
  const page = Number((sp.page as string) ?? 1);

  // replicate API logic server-side
  const allRankings = await prisma.ranking.findMany({
    where: { rank: { lte: top } },
    orderBy: [{ playerId: 'asc' }, { rankingDateId: 'asc' }],
    select: { playerId: true, rankingDateId: true, rankingDate: { select: { date: true } }, player: { select: { id: true, atpname: true, ioc: true } } },
  });

  let currentPlayerId: string | null = null;
  let currentPlayerInfo: { id?: string; name: string; ioc?: string } | null = null;
  let streakStart: Date | null = null;
  let streakEnd: Date | null = null;
  let prevRankingDateId: number | null = null;
  let currentStreak = 0;
  const result: Array<{id?:string; name:string; ioc?:string; weeks:number; startDate?:string; endDate?:string}> = [];

  const commitStreak = () => {
    if (!currentPlayerId || !currentPlayerInfo || !streakStart || !streakEnd || currentStreak < 1) return;
    result.push({ id: currentPlayerInfo.id, name: currentPlayerInfo.name, ioc: currentPlayerInfo.ioc, weeks: currentStreak, startDate: formatDate(streakStart), endDate: formatDate(streakEnd) });
  };

  for (const r of allRankings) {
    const currentDate = new Date(r.rankingDate.date);
    if (r.playerId !== currentPlayerId) {
      commitStreak();
      currentPlayerId = r.playerId;
      currentPlayerInfo = { id: r.player?.id, name: r.player?.atpname ?? r.playerId, ioc: r.player?.ioc ?? undefined };
      streakStart = currentDate; streakEnd = currentDate; prevRankingDateId = r.rankingDateId; currentStreak = 1; continue;
    }
    if (r.rankingDateId === (prevRankingDateId ?? 0) + 1) { currentStreak += 1; streakEnd = currentDate; }
    else { commitStreak(); currentStreak = 1; streakStart = currentDate; streakEnd = currentDate; }
    prevRankingDateId = r.rankingDateId;
  }
  commitStreak();

  result.sort((a,b)=> b.weeks - a.weeks);

  // Enrich with slugs for JSON-LD
  const slugIds = result.slice(0, 10).map(r => r.id).filter(Boolean) as string[];
  let slugMap = new Map<string, string | null>();
  if (slugIds.length > 0) {
    const slugRows = await prisma.player.findMany({ where: { id: { in: slugIds } }, select: { id: true, slug: true } });
    slugMap = new Map(slugRows.map(r => [r.id as string, r.slug as string | null]));
  }

  const totalPages = Math.ceil(result.length / perPage);
  const start = (page - 1) * perPage;
  const pageRows = result.slice(start, start + perPage);

  return (
    <section className="mb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'ItemList',
        'url': `https://stats.tennismylife.org/recordsranking/streak/consecutiveweeksattop/${top}`,
        'inLanguage': 'en-US',
        'isPartOf': { '@type': 'WebSite', 'name': 'TennisMyLife', 'url': 'https://stats.tennismylife.org' },
        'dateModified': new Date().toISOString(),
        'name': `Longest Consecutive Weeks in ATP Top ${top} – All-Time`,
        'description': `Longest consecutive week streaks inside the ATP Top ${top} in history.`,
        'numberOfItems': Math.min(result.length, 10),
        'itemListElement': result.slice(0, 10).map((r, idx) => ({
          '@type': 'ListItem', 'position': idx + 1,
          'item': { '@type': 'SportsStatistic', 'name': r.name, ...(r.id && slugMap.get(String(r.id)) ? { 'url': `https://stats.tennismylife.org/players/${slugMap.get(String(r.id))}/ranking` } : {}), 'additionalProperty': [
            { '@type': 'PropertyValue', 'name': 'Consecutive Weeks', 'value': r.weeks },
            ...(r.startDate ? [{ '@type': 'PropertyValue', 'name': 'Start', 'value': r.startDate }] : []),
            ...(r.endDate ? [{ '@type': 'PropertyValue', 'name': 'End', 'value': r.endDate }] : []),
          ]},
        })),
      }) }} />
      <div className="flex items-center gap-4 mb-4">
        <label className="text-gray-200 font-medium">Top:</label>
        <DropdownNavSelect name="top" value={String(top)} options={[2,3,4,5,6,7,8,9,10,20,30,50,100].map(n => ({ value: String(n), label: `Top ${n}`}))} pathMode />
      </div>

      {/* Descriptive paragraph — page 1 only */}
      {page === 1 && result.length > 0 && (() => {
        const leader = result[0];
        const second = result[1];
        const third  = result[2];
        const withAtLeast4 = result.filter(p => p.weeks >= 4).length;
        return (
          <div className="mb-6 px-5 py-4 rounded-xl bg-gray-800/50 border border-white/10 text-gray-400 text-sm leading-relaxed max-w-3xl mx-auto">
            <p>
              The all-time record for consecutive weeks inside the ATP Top{' '}
              <span className="text-white font-medium">{top}</span> belongs to{' '}
              <span className="text-indigo-300 font-medium">{leader.name}</span>{' '}
              with <span className="text-white font-medium">{leader.weeks} consecutive week{leader.weeks !== 1 ? 's' : ''}</span>
              {leader.startDate && leader.endDate ? (
                <> (from{' '}
                  <span className="text-white font-medium">{leader.startDate}</span> to{' '}
                  <span className="text-white font-medium">{leader.endDate}</span>)
                </>
              ) : null}.
              {second ? (
                <> The second-longest streak is held by{' '}
                  <span className="text-indigo-300 font-medium">{second.name}</span>{' '}
                  ({second.weeks} weeks)
                  {third ? (
                    <>, followed by{' '}
                      <span className="text-indigo-300 font-medium">{third.name}</span>{' '}
                      ({third.weeks} weeks)
                    </>
                  ) : null}.
                </>
              ) : null}
              {withAtLeast4 > 0 && (
                <> A total of <span className="text-white font-medium">{withAtLeast4}</span>{' '}
                  player{withAtLeast4 !== 1 ? 's have' : ' has'} remained inside the Top {top} consecutively for at least one month.
                </>
              )}
            </p>
          </div>
        );
      })()}

      {pageRows.length === 0 ? (<div className="text-gray-400 py-4 text-center">No data available.</div>) : (
        <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
          <table className="min-w-full border-collapse">
            <caption className="py-2 text-sm font-semibold text-gray-400 uppercase tracking-wide">Record leaderboard</caption>
            <thead>
              <tr className="bg-black"><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Top</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Weeks</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Start</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">End</th></tr>
            </thead>
            <tbody>
              {pageRows.map((p, idx)=> (
                <tr key={`${p.id ?? p.name}-${start + idx}`} className="hover:bg-gray-800 border-b border-white/10"><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{start + idx + 1}</td><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200"><div className="flex items-center justify-center gap-2">{p.ioc && <Flag ioc={p.ioc} className="w-4 h-3" />}<span>{p.name}</span></div></td><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.weeks}</td><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.startDate}</td><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.endDate}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <ServerPagination page={page} totalPages={totalPages} getHref={(p) => (sp as any)._numericInPath === '1' ? `?page=${p}` : `?top=${top}&page=${p}`} />
      )} 
    </section>
  );
} 