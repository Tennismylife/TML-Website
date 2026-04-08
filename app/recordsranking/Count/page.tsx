import React from 'react';
import type { Metadata } from 'next';
import Flag from '@/components/Flag';
import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import RecordsCountControls from "./RecordsCountControls";
import ServerPagination from '@/components/ServerPagination';

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const rank = Number((sp.rank as string) ?? 1);
  const page = Number((sp.page as string) ?? '1');
  const SITE = 'https://stats.tennismylife.org';
  const OG_IMAGE = `${SITE}/og/site-preview.png`;
  const title = `Most Weeks at ATP No. ${rank} – All-Time Records`;
  const description = `Which players spent the most weeks ranked at ATP No. ${rank}? Complete all-time historical list.`;
  const canonical = `${SITE}/recordsranking/weeksatno/${rank}`;
  return {
    title,
    description,
    keywords: [`most weeks ATP No. ${rank}`, `weeks at number ${rank}`, 'ATP ranking records', 'most weeks No 1', 'ATP history', 'tennis records'],
    alternates: { canonical },
    openGraph: { type: 'website', url: canonical, siteName: 'TennisMyLife', title, description, images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title, description, images: [OG_IMAGE] },
    robots: page > 1 ? { index: false, follow: true } : { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
    authors: [{ name: 'TennisMyLife' }],
  };
}

interface Player {
  id: string;
  name: string;
  ioc?: string | null;
  weeks: number;
  slug?: string | null;
}

async function RecordsCountMain({ searchParams, showHeading = true }: { searchParams?: Promise<Record<string, string | string[]>>; showHeading?: boolean }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const initialTop = Number((sp.rank as string) ?? 1);
  const page = Number((sp.page as string) ?? '1');
  const perPage = 20;

  // Server-side query (same logic as API route)
  const rank = initialTop;
  const weeksAtRank = await prisma.ranking.groupBy({
    by: ["playerId"],
    where: { rank },
    _count: { rankingDateId: true },
  });

  const playerIds = weeksAtRank.map(r => r.playerId);

  const playersRaw = await prisma.player.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, atpname: true, ioc: true, slug: true },
  });

  const nameMap = Object.fromEntries(playersRaw.map(p => [p.id, p.atpname]));
  const iocMap = Object.fromEntries(playersRaw.map(p => [p.id, p.ioc]));
  const slugMap = Object.fromEntries(playersRaw.map(p => [p.id, p.slug]));

  const result: Player[] = weeksAtRank
    .map(r => ({
      id: r.playerId,
      name: nameMap[r.playerId] ?? "Unknown",
      ioc: iocMap[r.playerId] ?? null,
      weeks: r._count.rankingDateId,
      slug: slugMap[r.playerId] ?? null,
    }))
    .sort((a, b) => b.weeks - a.weeks);

  const totalCount = result.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const paginatedPlayers = result.slice(start, start + perPage);

  const renderTable = (list: Player[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <caption className="py-2 text-sm font-semibold text-gray-400 uppercase tracking-wide">Record leaderboard</caption>
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">
              Rank
            </th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">
              Player
            </th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">
              Weeks at No. {initialTop}
            </th>
          </tr>
        </thead>
        <tbody>
          {list.map((p, idx) => (
            <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                {startIndex + idx + 1}
              </td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                <div className="flex items-center justify-center gap-2">
                  {p.ioc && <Flag ioc={p.ioc} className="w-4 h-3" />}
                  {p.slug ? <Link href={`/players/${p.slug}/ranking`} className="hover:underline">{p.name}</Link> : <span>{p.name}</span>}
                </div>
              </td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">
                {p.weeks}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'ItemList',
        'url': `https://stats.tennismylife.org/recordsranking/weeksatno/${rank}`,
        'inLanguage': 'en-US',
        'isPartOf': { '@type': 'WebSite', 'name': 'TennisMyLife', 'url': 'https://stats.tennismylife.org' },
        'dateModified': new Date().toISOString(),
        'name': `Most Weeks at ATP No. ${rank} – All-Time Leaders`,
        'description': `Players with the most weeks ranked at No. ${rank} in ATP history.`,
        'numberOfItems': Math.min(result.length, 10),
        'itemListElement': result.slice(0, 10).map((r, idx) => ({
          '@type': 'ListItem', 'position': idx + 1,
          'item': { '@type': 'SportsStatistic', 'name': r.name, ...(r.slug ? { 'url': `https://stats.tennismylife.org/players/${r.slug}/ranking` } : {}), 'additionalProperty': [
            { '@type': 'PropertyValue', 'name': 'Weeks', 'value': r.weeks },
          ]},
        })),
      }) }} />
      {/* Controls (client component) */}
      <React.Suspense fallback={<div className="text-gray-400 py-2 text-center">Loading controls...</div>}>
        <RecordsCountControls initialTop={initialTop} />
      </React.Suspense>

      {showHeading && (
        <h1 className="text-xl font-semibold mb-4 text-gray-200 text-center">
          Most Weeks at No. {initialTop}
        </h1>
      )}

      {/* Descriptive paragraph — shown only on page 1 */}
      {page === 1 && result.length > 0 && (() => {
        const leader = result[0];
        const second = result[1];
        const third  = result[2];

        // Computed stats from full result set
        const totalWeeks   = result.reduce((s, p) => s + p.weeks, 0);
        const avgWeeks     = Math.round(totalWeeks / result.length);
        const overOneYear  = result.filter(p => p.weeks >= 52).length;
        const gapPct       = second ? Math.round(((leader.weeks - second.weeks) / second.weeks) * 100) : null;

        // Rank-specific threshold labels
        const thresholdLabel = rank === 1 ? 'at world No. 1' : `at No. ${rank}`;
        const verbPhrase     = rank === 1
          ? 'have held the world No. 1 ranking'
          : `have spent at least one week ranked at No. ${rank}`;

        return (
          <div className="mb-6 px-5 py-4 rounded-xl bg-gray-800/50 border border-white/10 text-gray-400 text-sm leading-relaxed max-w-3xl mx-auto">
            <p>
              Since the ATP computerized ranking was introduced in{' '}
              <span className="text-white font-medium">1973</span>,{' '}
              <span className="text-white font-medium">{totalCount} player{totalCount !== 1 ? 's' : ''}</span>{' '}
              {verbPhrase}.{' '}
              {leader && (
                <>
                  The all-time leader is{' '}
                  <span className="text-indigo-300 font-medium">{leader.name}</span>{' '}
                  with <span className="text-white font-medium">{leader.weeks} week{leader.weeks !== 1 ? 's' : ''}</span>
                  {gapPct !== null && gapPct > 0 ? (
                    <>, a margin{' '}
                      <span className="text-white font-medium">{gapPct}%</span> ahead of{' '}
                      <span className="text-indigo-300 font-medium">{second!.name}</span>{' '}
                      ({second!.weeks} weeks)
                      {third ? (
                        <> and{' '}
                          <span className="text-indigo-300 font-medium">{third.name}</span>{' '}
                          ({third.weeks} weeks)
                        </>
                      ) : null}
                    </>
                  ) : second ? (
                    <>, followed by{' '}
                      <span className="text-indigo-300 font-medium">{second.name}</span>{' '}
                      ({second.weeks} weeks)
                      {third ? (
                        <> and{' '}
                          <span className="text-indigo-300 font-medium">{third.name}</span>{' '}
                          ({third.weeks} weeks)
                        </>
                      ) : null}
                    </>
                  ) : null}.{' '}
                </>
              )}
              {overOneYear > 0 && (
                <>
                  <span className="text-white font-medium">{overOneYear}</span>{' '}
                  player{overOneYear !== 1 ? 's have' : ' has'} spent 52 or more weeks{' '}
                  {thresholdLabel} (at least one full year), with an average of{' '}
                  <span className="text-white font-medium">{avgWeeks}</span> week{avgWeeks !== 1 ? 's' : ''} across all ranked players.
                </>
              )}
            </p>
          </div>
        );
      })()}

      {/* Tabella principale (server-rendered) */}
      {paginatedPlayers.length > 0 ? renderTable(paginatedPlayers, start) : (
        <div className="text-gray-400 py-4 text-center">No data available.</div>
      )}

      {/* Server-side styled pagination */}
      { totalPages > 1 && (
        <ServerPagination
          page={page}
          totalPages={totalPages}
          getHref={(p) => (sp as any)._numericInPath === '1' ? `?page=${p}` : `?rank=${initialTop}&page=${p}`}
        />
      )}
    </section>
  );
}

export default async function RecordsCount({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const args: any = arguments[0] ?? {};
  const showHeading = args.showHeading ?? true;
  return await RecordsCountMain({ searchParams, showHeading });
}
