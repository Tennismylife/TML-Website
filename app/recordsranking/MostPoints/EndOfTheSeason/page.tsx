import React from 'react';
import type { Metadata } from 'next';
import { prisma } from "@/lib/prisma";
import Flag from '@/components/Flag';
import Link from 'next/link';

const SITE = 'https://stats.tennismylife.org';
const OG_IMAGE = `${SITE}/og/site-preview.png`;
const _title = 'Highest Year-End ATP Points – All-Time Records';
const _description = 'Which players accumulated the most ATP ranking points at year-end? Historical all-time list with points totals and years.';
const _canonical = `${SITE}/recordsranking/mostpoints/endoftheseason`;
export const metadata: Metadata = {
  title: _title,
  description: _description,
  keywords: ['most ATP points year-end', 'highest ATP ranking points', 'ATP year-end points record', 'ATP history', 'tennis records'],
  alternates: { canonical: _canonical },
  openGraph: { type: 'website', url: _canonical, siteName: 'TennisMyLife', title: _title, description: _description, images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: _title }] },
  twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title: _title, description: _description, images: [OG_IMAGE] },
  robots: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
  authors: [{ name: 'TennisMyLife' }],
};

interface YearEndMaxPointsItem {
  name: string;
  country: string; // IOC code
  points: number;
  year: number | string;
  slug?: string | null;
}

async function No1YearEndMaxPointsRankingMain({ searchParams, showHeading = true }: { searchParams?: Promise<Record<string, string | string[]>>, showHeading?: boolean }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;

  // Server-side replication of API logic
  const allDates = await prisma.rankingDate.findMany({ select: { date: true }, orderBy: { date: 'asc' } });
  const allYears = Array.from(new Set(allDates.map(d => d.date.getUTCFullYear())));
  if (allYears.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const lastDates = await Promise.all(allYears.map(async (year) => {
    const last = await prisma.rankingDate.findFirst({ where: { date: { gte: new Date(Date.UTC(year,0,1)), lt: new Date(Date.UTC(year+1,0,1)) } }, orderBy: { date: 'desc' }, select: { id: true, date: true } });
    return last ? { year, id: last.id, date: last.date } : null;
  }));
  const validLast = (lastDates.filter(Boolean) as { year: number; id: number; date: Date }[]);
  if (validLast.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const lastDateIds = validLast.map(d => d.id);

  const grouped = await prisma.ranking.groupBy({ by: ["playerId"], where: { rankingDateId: { in: lastDateIds } }, _max: { points: true }, orderBy: [{ _max: { points: 'desc' } }], take: 100 });

  const candidates = await prisma.ranking.findMany({ where: { OR: grouped.map(g => ({ playerId: g.playerId, points: g._max.points!, rankingDateId: { in: lastDateIds } })) }, select: { playerId: true, points: true, rankingDate: { select: { date: true } }, player: { select: { atpname: true, ioc: true, slug: true } } } });

  const candidateMap = new Map<string, typeof candidates[number]>();
  for (const row of candidates) { if (!candidateMap.has(row.playerId)) candidateMap.set(row.playerId, row); }

  const result: YearEndMaxPointsItem[] = grouped.map(g => {
    const row = candidateMap.get(g.playerId);
    const year = row?.rankingDate?.date ? row.rankingDate.date.getUTCFullYear() : null;
    return { name: row?.player?.atpname ?? 'Unknown', country: row?.player?.ioc ?? 'UNK', points: Number(g._max.points ?? 0), year: year ?? 'N/A', slug: row?.player?.slug ?? null };
  });

  const rows = result.slice(0, 20);
  const over10k = result.filter(r => r.points >= 10000).length;
  const over7k = result.filter(r => r.points >= 7000).length;
  const firstYear = validLast[0]?.year ?? null;
  const lastYear = validLast[validLast.length - 1]?.year ?? null;

  const renderTable = (list: YearEndMaxPointsItem[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <caption className="py-2 text-sm font-semibold text-gray-400 uppercase tracking-wide">Record leaderboard</caption>
        <thead>
          <tr className="bg-black"><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Points</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Year</th></tr>
        </thead>
        <tbody>
          {list.map((r, idx) => (<tr key={`${r.name}-${r.year}-${idx}`} className="hover:bg-gray-800 border-b border-white/10"><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{startIndex + idx + 1}</td><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200"><div className="flex items-center justify-center gap-2">{r.country && <Flag ioc={r.country} className="w-4 h-3" />}{r.slug ? <Link href={`/players/${r.slug}/ranking`} className="hover:underline">{r.name}</Link> : <span>{r.name}</span>}</div></td><td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">{r.points.toLocaleString()}</td><td className="border border-white/10 px-4 py-2 text-center text-gray-300">{r.year}</td></tr>))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'ItemList',
        'url': 'https://stats.tennismylife.org/recordsranking/mostpoints/endoftheseason',
        'inLanguage': 'en-US',
        'isPartOf': { '@type': 'WebSite', 'name': 'TennisMyLife', 'url': 'https://stats.tennismylife.org' },
        'dateModified': new Date().toISOString(),
        'name': 'Highest Year-End ATP Points – All-Time',
        'description': 'Players with the highest ATP ranking points at year-end in history.',
        'numberOfItems': Math.min(rows.length, 10),
        'itemListElement': rows.slice(0, 10).map((r, idx) => ({
          '@type': 'ListItem', 'position': idx + 1,
          'item': { '@type': 'SportsStatistic', 'name': r.name, ...(r.slug ? { 'url': `https://stats.tennismylife.org/players/${r.slug}/ranking` } : {}), 'additionalProperty': [
            { '@type': 'PropertyValue', 'name': 'Points', 'value': r.points },
            { '@type': 'PropertyValue', 'name': 'Year', 'value': r.year },
          ]},
        })),
      }) }} />

      {rows.length > 0 && (
        <div className="mb-6 px-5 py-4 rounded-xl bg-gray-800/50 border border-white/10 text-gray-400 text-sm leading-relaxed max-w-3xl mx-auto">
          The highest ATP ranking points ever recorded at year-end is{' '}
          <span className="text-white font-medium">{rows[0].points.toLocaleString()}</span> points, achieved by{' '}
          <span className="text-indigo-300 font-medium">{rows[0].name}</span> in{' '}
          <span className="text-white font-medium">{rows[0].year}</span>.
          {rows.length > 1 && (
            <> Second all-time is <span className="text-indigo-300 font-medium">{rows[1].name}</span>{' '}
            with <span className="text-white font-medium">{rows[1].points.toLocaleString()}</span> points.</>
          )}
          {rows.length > 2 && (
            <> Third is <span className="text-indigo-300 font-medium">{rows[2].name}</span>{' '}
            with <span className="text-white font-medium">{rows[2].points.toLocaleString()}</span> points.</>
          )}
          {over10k > 0 && (
            <>{' '}Only <span className="text-white font-medium">{over10k}</span> player{over10k > 1 ? 's have' : ' has'} ever closed a year above the 10,000-point mark.</>
          )}
          {over7k > over10k && (
            <>{' '}<span className="text-white font-medium">{over7k}</span> have closed a year above 7,000 points.</>
          )}
          {firstYear && lastYear && (
            <>{' '}Data covers year-end rankings from <span className="text-white font-medium">{firstYear}</span> to <span className="text-white font-medium">{lastYear}</span>, spanning <span className="text-white font-medium">{validLast.length}</span> seasons.</>
          )}
        </div>
      )}

      {rows.length > 0 ? renderTable(rows, 0) : (<div className="text-gray-400 py-4 text-center">No data available.</div>)}
    </section>
  );
}

export default async function No1YearEndMaxPointsRanking({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const args: any = arguments[0] ?? {};
  const showHeading = args.showHeading ?? true;
  return await No1YearEndMaxPointsRankingMain({ searchParams, showHeading });
}
