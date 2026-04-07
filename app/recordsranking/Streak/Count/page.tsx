import React from 'react';
import type { Metadata } from 'next';
import Flag from '@/components/Flag';
import { getPlayerHrefWithTab } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import RecordsCountControls from "../../Count/RecordsCountControls";
import ServerPagination from '@/components/ServerPagination';
import Link from "next/link";

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const rank = Number((sp.rank as string) ?? 1);
  const page = Number((sp.page as string) ?? '1');
  const SITE = 'https://stats.tennismylife.org';
  const OG_IMAGE = `${SITE}/og/site-preview.png`;
  const title = `Longest Consecutive Weeks at ATP No. ${rank} – All-Time`;
  const description = `Which players held ATP No. ${rank} for the most consecutive weeks? Complete all-time streak records.`;
  const canonical = `${SITE}/recordsranking/streak/consecutiveweeksatno/${rank}`;
  return {
    title,
    description,
    keywords: [`consecutive weeks ATP No. ${rank}`, 'ATP streak record', 'longest streak No 1', 'consecutive weeks No 1', 'ATP history', 'tennis records'],
    alternates: { canonical },
    openGraph: { type: 'website', url: canonical, siteName: 'TennisMyLife', title, description, images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title, description, images: [OG_IMAGE] },
    robots: page > 1 ? { index: false, follow: true } : { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
    authors: [{ name: 'TennisMyLife' }],
  };
}

interface Player {
  id?: string;
  name: string;
  ioc?: string | null;
  weeks: number;
  startDate?: string;
  endDate?: string;
}

async function StreakCountMain({ searchParams, showHeading = true }: { searchParams?: Promise<Record<string, string | string[]>>, showHeading?: boolean }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const rank = Number((sp.rank as string) ?? 1);
  const page = Number((sp.page as string) ?? '1');
  const perPage = 20;

  // replicate server logic from API route
  const allRankings = await prisma.ranking.findMany({
    where: { rank },
    orderBy: [{ playerId: "asc" }, { rankingDate: { date: "asc" } }],
    select: {
      playerId: true,
      rankingDate: { select: { date: true } },
      player: { select: { id: true, atpname: true, ioc: true } },
    },
  });

  const resultMap: Record<string, Player & { weeks: number }> = {};

  let currentPlayerId: string | null = null;
  let currentPlayerInfo: { id?: string; name: string; ioc?: string | null } | null = null;
  let prevDate: Date | null = null;
  let currentStreak = 0;
  let maxStreak = 0;
  let streakStart: Date | null = null;
  let streakEnd: Date | null = null;
  let maxStreakStart: Date | null = null;
  let maxStreakEnd: Date | null = null;

  const commitPlayer = () => {
    if (!currentPlayerId || !currentPlayerInfo) return;
    const prev = resultMap[currentPlayerId];
    const best = Math.max(prev?.weeks ?? 0, maxStreak);

    resultMap[currentPlayerId] = {
      id: currentPlayerInfo.id,
      name: currentPlayerInfo.name,
      ioc: currentPlayerInfo.ioc ?? null,
      weeks: best,
      startDate: maxStreakStart?.toISOString().split("T")[0],
      endDate: maxStreakEnd?.toISOString().split("T")[0],
    } as Player & { weeks: number };
  };

  for (const r of allRankings) {
    if (r.playerId !== currentPlayerId) {
      commitPlayer();
      currentPlayerId = r.playerId;
      currentPlayerInfo = {
        id: r.player?.id,
        name: r.player?.atpname ?? r.playerId,
        ioc: r.player?.ioc ?? undefined,
      };
      prevDate = null;
      currentStreak = 0;
      maxStreak = 0;
      streakStart = null;
      streakEnd = null;
      maxStreakStart = null;
      maxStreakEnd = null;
    }

    if (prevDate) {
      const diffDays = Math.round(
        (r.rankingDate.date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays >= 6 && diffDays <= 8) {
        currentStreak += 1;
        streakEnd = r.rankingDate.date;
      } else {
        currentStreak = 1;
        streakStart = r.rankingDate.date;
        streakEnd = r.rankingDate.date;
      }
    } else {
      currentStreak = 1;
      streakStart = r.rankingDate.date;
      streakEnd = r.rankingDate.date;
    }

    if (currentStreak > maxStreak) {
      maxStreak = currentStreak;
      maxStreakStart = streakStart;
      maxStreakEnd = streakEnd;
    }

    prevDate = r.rankingDate.date;
  }

  commitPlayer();

  const resultArray: (Player & { weeks: number })[] = Object.values(resultMap).sort((a, b) => b.weeks - a.weeks);

  // Enrich with slugs where available so links point to canonical /players/:slug/matches
  const ids = resultArray.map(r => r.id).filter(Boolean) as string[];
  let slugMap = new Map<string, string | null>();
  if (ids.length > 0) {
    const rows = await prisma.player.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } });
    slugMap = new Map(rows.map(r => [r.id as string, r.slug as string | null]));
  }

  const totalPages = Math.ceil(resultArray.length / perPage);
  const start = (page - 1) * perPage;
  const paginatedPlayers = resultArray.slice(start, start + perPage);

  const renderTable = () => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <caption className="py-2 text-sm font-semibold text-gray-400 uppercase tracking-wide">Record leaderboard</caption>
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Weeks</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Start Date</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">End Date</th>
          </tr>
        </thead>
        <tbody>
          {paginatedPlayers.map((p, idx) => {
            const globalRank = start + idx + 1;
            const flagEl = p.ioc ? <Flag ioc={p.ioc} className="w-4 h-3" /> : null;
            return (
              <tr key={`${p.id ?? p.name}-${start + idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  <div className="flex items-center justify-center gap-2">
                    {flagEl}
                    {p.id ? (
                      <Link href={getPlayerHrefWithTab(slugMap.get(String(p.id)) ?? String(p.id), 'ranking')} className="hover:underline">{p.name}</Link>
                    ) : (
                      <span>{p.name}</span>
                    )}
                  </div>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.weeks}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.startDate ?? "-"}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.endDate ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <ServerPagination page={page} totalPages={totalPages} getHref={(p) => `?rank=${rank}&page=${p}`} />
      )}
    </div>
  );

  return (
    <section className="mb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'ItemList',
        'url': `https://stats.tennismylife.org/recordsranking/streak/consecutiveweeksatno/${rank}`,
        'inLanguage': 'en-US',
        'isPartOf': { '@type': 'WebSite', 'name': 'TennisMyLife', 'url': 'https://stats.tennismylife.org' },
        'dateModified': new Date().toISOString(),
        'name': `Longest Consecutive Weeks at No. ${rank} – All-Time`,
        'description': `Longest consecutive week streaks at ATP No. ${rank} in history.`,
        'numberOfItems': Math.min(resultArray.length, 10),
        'itemListElement': resultArray.slice(0, 10).map((r, idx) => ({
          '@type': 'ListItem', 'position': idx + 1,
          'item': { '@type': 'SportsStatistic', 'name': r.name, ...(r.id && slugMap.get(String(r.id)) ? { 'url': `https://stats.tennismylife.org/players/${slugMap.get(String(r.id))}/ranking` } : {}), 'additionalProperty': [
            { '@type': 'PropertyValue', 'name': 'Consecutive Weeks', 'value': r.weeks },
            ...(r.startDate ? [{ '@type': 'PropertyValue', 'name': 'Start', 'value': r.startDate }] : []),
            ...(r.endDate ? [{ '@type': 'PropertyValue', 'name': 'End', 'value': r.endDate }] : []),
          ]},
        })),
      }) }} />
      {showHeading !== false && (
        <h1 className="text-xl font-semibold mb-4 text-gray-200 text-center">
          Most Consecutive Weeks at No. {rank}
        </h1>
      )}

      <React.Suspense fallback={<div className="text-gray-400 py-2 text-center">Loading controls...</div>}>
        <RecordsCountControls initialTop={rank} />
      </React.Suspense>

      {/* Descriptive paragraph — page 1 only */}
      {page === 1 && resultArray.length > 0 && (() => {
        const leader = resultArray[0];
        const second = resultArray[1];
        const third  = resultArray[2];
        const withAtLeast4 = resultArray.filter(p => p.weeks >= 4).length;
        return (
          <div className="mb-6 px-5 py-4 rounded-xl bg-gray-800/50 border border-white/10 text-gray-400 text-sm leading-relaxed max-w-3xl mx-auto">
            <p>
              The all-time record for consecutive weeks ranked at ATP No.{' '}
              <span className="text-white font-medium">{rank}</span> belongs to{' '}
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
                  player{withAtLeast4 !== 1 ? 's have' : ' has'} held No. {rank} consecutively for at least one month.
                </>
              )}
            </p>
          </div>
        );
      })()}

      {renderTable()}
    </section>
  );
}

export default async function StreakCount({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const args: any = arguments[0] ?? {};
  const showHeading = args.showHeading ?? true;
  return await StreakCountMain({ searchParams, showHeading });
}

