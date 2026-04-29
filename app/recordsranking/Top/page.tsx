import React from 'react';
import type { Metadata } from 'next';
import Flag from '@/components/Flag';
import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import RecordsTopControls from "./RecordsTopControls";
import ServerPagination from '@/components/ServerPagination';
import { notFound } from 'next/navigation';

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const top = Number((Array.isArray(sp.top) ? sp.top[0] : sp.top) ?? 2);
  const page = Number((sp.page as string) ?? '1');
  const SITE = 'https://stats.tennismylife.org';
  const OG_IMAGE = `${SITE}/og/site-preview.png`;
  const title = `Most Weeks in ATP Top ${top} – All-Time Records`;
  const description = `Which players spent the most weeks ranked inside the ATP Top ${top}? Complete all-time historical list.`;
  const canonical = `${SITE}/recordsranking/weeksattop/${top}`;
  return {
    title,
    description,
    keywords: [`most weeks ATP Top ${top}`, `weeks in Top ${top}`, 'ATP ranking records', 'most weeks Top 10', 'ATP history', 'tennis records'],
    alternates: { canonical },
    openGraph: { type: 'website', url: canonical, siteName: 'TennisMyLife', title, description, images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title, description, images: [OG_IMAGE] },
    robots: page > 1 ? { index: false, follow: true } : { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
    authors: [{ name: 'TennisMyLife' }],
  };
}

interface TopXPlayer {
  id: string;
  name: string;
  ioc?: string | null;
  weeks: number;
  slug?: string | null;
}

export default async function RecordsTopX({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const initialTop = Number((sp.top as string) ?? 2);
  const page = Number((sp.page as string) ?? '1');
  if (!Number.isInteger(page) || page < 1) notFound();
  const perPage = 20;

  const top = initialTop;

  // Server-side query
  const weeksInTopX = await prisma.ranking.groupBy({
    by: ["playerId"],
    where: { rank: { lte: top } },
    _count: { rankingDateId: true },
  });

  const playerIds = weeksInTopX.map(r => r.playerId);

  const playersRaw = await prisma.player.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, atpname: true, ioc: true, slug: true },
  });

  const nameMap = Object.fromEntries(playersRaw.map(p => [p.id, p.atpname]));
  const iocMap = Object.fromEntries(playersRaw.map(p => [p.id, p.ioc]));
  const slugMap = Object.fromEntries(playersRaw.map(p => [p.id, p.slug]));

  const result: TopXPlayer[] = weeksInTopX
    .map(r => ({
      id: r.playerId,
      name: nameMap[r.playerId] ?? "Unknown",
      ioc: iocMap[r.playerId] ?? null,
      weeks: r._count.rankingDateId,
      slug: slugMap[r.playerId] ?? null,
    }))
    .sort((a, b) => b.weeks - a.weeks);

  const cappedResult = result.slice(0, 100);
  const totalCount = cappedResult.length;
  const totalPages = Math.ceil(totalCount / perPage);
  if (totalCount > 0 && page > totalPages) notFound();
  const start = (page - 1) * perPage;
  const paginatedPlayers = cappedResult.slice(start, start + perPage);

  const renderTable = (list: TopXPlayer[], startIndex = 0) => (
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
              Weeks in Top {initialTop}
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

  const leader = cappedResult[0];
  const second = cappedResult[1];
  const third  = cappedResult[2];
  const totalWeeks  = cappedResult.reduce((s, p) => s + p.weeks, 0);
  const avgWeeks    = Math.round(totalWeeks / (cappedResult.length || 1));
  const overOneYear = cappedResult.filter(p => p.weeks >= 52).length;
  const gapPct      = leader && second ? Math.round(((leader.weeks - second.weeks) / second.weeks) * 100) : null;

  return (
    <section className="mb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'ItemList',
        'url': `https://stats.tennismylife.org/recordsranking/weeksattop/${initialTop}`,
        'inLanguage': 'en-US',
        'isPartOf': { '@type': 'WebSite', 'name': 'TennisMyLife', 'url': 'https://stats.tennismylife.org' },
        'dateModified': new Date().toISOString(),
        'name': `Most Weeks in ATP Top ${top} – All-Time Leaders`,
        'description': `Players with the most weeks inside the ATP Top ${top} in history.`,
        'numberOfItems': Math.min(cappedResult.length, 10),
        'itemListElement': cappedResult.slice(0, 10).map((r, idx) => ({
          '@type': 'ListItem', 'position': idx + 1,
          'item': { '@type': 'SportsStatistic', 'name': r.name, ...(r.slug ? { 'url': `https://stats.tennismylife.org/players/${r.slug}/ranking` } : {}), 'additionalProperty': [
            { '@type': 'PropertyValue', 'name': 'Weeks', 'value': r.weeks },
          ]},
        })),
      }) }} />
      <React.Suspense fallback={<div className="text-gray-400 py-2 text-center">Loading controls...</div>}>
        <RecordsTopControls initialTop={initialTop} />
      </React.Suspense>

      <h1 className="text-xl font-semibold mb-4 text-gray-200 text-center">
        Most Weeks in Top {initialTop}
      </h1>

      {/* Descriptive paragraph — page 1 only */}
      {page === 1 && leader && (
        <div className="mb-6 px-5 py-4 rounded-xl bg-gray-800/50 border border-white/10 text-gray-400 text-sm leading-relaxed max-w-3xl mx-auto">
          <p>
            Since the ATP computerized ranking was introduced in{' '}
            <span className="text-white font-medium">1973</span>,{' '}
            {totalCount < 100 && (
              <>this page lists the <span className="text-white font-medium">{totalCount}</span> players returned by the API for Top {top}, rather than the complete historical total. </>
            )}
            the all-time leader is{' '}
            <span className="text-indigo-300 font-medium">{leader.name}</span>{' '}
            with <span className="text-white font-medium">{leader.weeks} week{leader.weeks !== 1 ? 's' : ''}</span>
            {gapPct !== null && gapPct > 0 ? (
              <>, a margin{' '}
                <span className="text-white font-medium">{gapPct}%</span> ahead of{' '}
                <span className="text-indigo-300 font-medium">{second!.name}</span>{' '}
                ({second!.weeks} weeks)
                {third && <> and <span className="text-indigo-300 font-medium">{third.name}</span> ({third.weeks} weeks)</>}
              </>
            ) : second ? (
              <>, followed by{' '}
                <span className="text-indigo-300 font-medium">{second.name}</span>{' '}
                ({second.weeks} weeks)
                {third && <> and <span className="text-indigo-300 font-medium">{third.name}</span> ({third.weeks} weeks)</>}
              </>
            ) : null}.{' '}
            {overOneYear > 0 && (
              <>
                <span className="text-white font-medium">{overOneYear}</span>{' '}
                player{overOneYear !== 1 ? 's have' : ' has'} accumulated 52 or more weeks inside the Top {top}, with an average of{' '}
                <span className="text-white font-medium">{avgWeeks}</span> weeks across all ranked players.
              </>
            )}
          </p>
        </div>
      )}

      {paginatedPlayers.length > 0 ? renderTable(paginatedPlayers, start) : (
        <div className="text-gray-400 py-4 text-center">No data available.</div>
      )}

          {totalPages > 1 && (
        <ServerPagination page={page} totalPages={totalPages} getHref={(p) => (sp as any)._numericInPath === '1' ? `?page=${p}` : `?top=${initialTop}&page=${p}`} />
      )}
    </section>
  );
}
