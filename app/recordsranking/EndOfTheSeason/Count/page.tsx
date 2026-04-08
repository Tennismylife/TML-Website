import React from 'react';
import { prisma } from "@/lib/prisma";
import Flag from '@/components/Flag';
import Link from 'next/link';
import EndSeasonCountControls from "./EndSeasonCountControls";
import ServerPagination from '@/components/ServerPagination';
import type { Metadata } from 'next';

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const rank = Number((sp.rank as string) ?? 1);
  const page = Number((sp.page as string) ?? '1');
  const SITE = 'https://stats.tennismylife.org';
  const OG_IMAGE = `${SITE}/og/site-preview.png`;
  const title = `Seasons at Year-End No. ${rank} – ATP Ranking Records`;
  const description = `Which players finished the most seasons ranked at ATP No. ${rank} at year-end? Complete all-time list with individual years.`;
  const canonical = `${SITE}/recordsranking/endoftheseason/${rank}`;
  return {
    title,
    description,
    keywords: [`year-end No. ${rank}`, 'ATP year-end ranking', 'tennis ranking records', 'end of season ATP', 'ATP history'],
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
  endYearCount: number;
  seasons: number[];
  slug?: string | null;
}

export default async function RecordsCount({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const rank = Number((sp.rank as string) ?? 1);
  const page = Number((sp.page as string) ?? '1');
  const perPage = 20;

  // Server-side logic from API
  const allDates = await prisma.rankingDate.findMany({ select: { date: true }, orderBy: { date: 'asc' } });
  const allYears = Array.from(new Set(allDates.map(d => d.date.getUTCFullYear())));
  if (allYears.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const lastDates = await Promise.all(
    allYears.map(async (year) => {
      const last = await prisma.rankingDate.findFirst({
        where: {
          date: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) }
        },
        orderBy: { date: 'desc' },
        select: { id: true, date: true }
      });
      return last ? { year, id: last.id, date: last.date } : null;
    })
  );

  const validLast = (lastDates.filter(Boolean) as { year: number; id: number; date: Date }[]);
  const lastDateIds = validLast.map(d => d.id);

  const rows = await prisma.ranking.findMany({
    where: { rank, rankingDateId: { in: lastDateIds } },
    select: { playerId: true, player: { select: { atpname: true, ioc: true, slug: true } }, rankingDate: { select: { date: true } } }
  });

  const agg = new Map<string, { name: string; ioc: string | null; endYearCount: number; seasons: Set<number>; slug: string | null }>();
  for (const r of rows) {
    if (!r.player) continue;
    const id = String(r.playerId);
    const year = r.rankingDate.date.getUTCFullYear();
    let a = agg.get(id);
    if (!a) {
      a = { name: r.player.atpname ?? '', ioc: r.player.ioc ?? null, endYearCount: 0, seasons: new Set<number>(), slug: r.player.slug ?? null };
      agg.set(id, a);
    }
    a.endYearCount += 1;
    a.seasons.add(year);
  }

  const data = Array.from(agg.entries()).map(([id, v]) => ({ id, name: v.name, ioc: v.ioc, endYearCount: v.endYearCount, seasons: Array.from(v.seasons).sort((a,b)=>a-b), slug: v.slug }))
    .sort((a,b) => (b.endYearCount - a.endYearCount) || a.name.localeCompare(b.name));

  const totalCount = data.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const paginatedPlayers = data.slice(start, start + perPage);

  const renderTable = (list: Player[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <caption className="py-2 text-sm font-semibold text-gray-400 uppercase tracking-wide">Record leaderboard</caption>
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Seasons at No. {rank}</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Years</th>
          </tr>
        </thead>
        <tbody>
          {list.map((p, idx) => (
            <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{startIndex + idx + 1}</td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                <div className="flex items-center justify-center gap-2">{p.ioc && <Flag ioc={p.ioc} className="w-4 h-3" />}{p.slug ? <Link href={`/players/${p.slug}/ranking`} className="hover:underline">{p.name}</Link> : <span>{p.name}</span>}</div>
              </td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">{p.endYearCount}</td>
              <td className="border border-white/10 px-4 py-2 text-center text-gray-300">{p.seasons && p.seasons.length > 0 ? p.seasons.join(", ") : "—"}</td>
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
        'url': `https://stats.tennismylife.org/recordsranking/endoftheseason/${rank}`,
        'inLanguage': 'en-US',
        'isPartOf': { '@type': 'WebSite', 'name': 'TennisMyLife', 'url': 'https://stats.tennismylife.org' },
        'dateModified': new Date().toISOString(),
        'name': `Most Season-End No. ${rank} Finishes – All-Time`,
        'description': `Players with the most ATP year-end No. ${rank} finishes in history.`,
        'numberOfItems': Math.min(data.length, 10),
        'itemListElement': data.slice(0, 10).map((r, idx) => ({
          '@type': 'ListItem', 'position': idx + 1,
          'item': { '@type': 'SportsStatistic', 'name': r.name, ...(r.slug ? { 'url': `https://stats.tennismylife.org/players/${r.slug}/ranking` } : {}), 'additionalProperty': [
            { '@type': 'PropertyValue', 'name': 'Year-End Count', 'value': r.endYearCount },
          ]},
        })),
      }) }} />
      <React.Suspense fallback={<div className="text-gray-400 py-2 text-center">Loading controls...</div>}>
        <EndSeasonCountControls initialRank={rank} />
      </React.Suspense>

      {/* Descriptive paragraph — page 1 only */}
      {page === 1 && data.length > 0 && (() => {
        const leader = data[0];
        const second = data[1];
        const third  = data[2];
        return (
          <div className="mb-6 px-5 py-4 rounded-xl bg-gray-800/50 border border-white/10 text-gray-400 text-sm leading-relaxed max-w-3xl mx-auto">
            <p>
              <span className="text-white font-medium">{totalCount} player{totalCount !== 1 ? 's have' : ' has'}</span>{' '}
              finished at least one season ranked at ATP No.{' '}
              <span className="text-white font-medium">{rank}</span> since{' '}
              <span className="text-white font-medium">1973</span>.{' '}
              <span className="text-indigo-300 font-medium">{leader.name}</span>{' '}
              leads with <span className="text-white font-medium">{leader.endYearCount} year-end finish{leader.endYearCount !== 1 ? 'es' : ''}</span>
              {leader.seasons && leader.seasons.length > 0 ? (
                <> ({leader.seasons.join(', ')})</>
              ) : null}
              {second ? (
                <>, ahead of{' '}
                  <span className="text-indigo-300 font-medium">{second.name}</span>{' '}
                  ({second.endYearCount})
                  {third ? (
                    <> and{' '}
                      <span className="text-indigo-300 font-medium">{third.name}</span>{' '}
                      ({third.endYearCount})
                    </>
                  ) : null}
                </>
              ) : null}.
            </p>
          </div>
        );
      })()}

      {paginatedPlayers.length > 0 ? renderTable(paginatedPlayers, start) : (
        <div className="text-gray-400 py-4 text-center">No data available.</div>
      )}

      {totalPages > 1 && (
        <ServerPagination page={page} totalPages={totalPages} getHref={(p) => (sp as any)._numericInPath === '1' ? `?page=${p}` : `?rank=${rank}&page=${p}`} />
      )}
    </section>
  );
}