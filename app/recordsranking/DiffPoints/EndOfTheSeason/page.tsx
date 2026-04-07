import React from 'react';
import { prisma } from '@/lib/prisma';
import Flag from '@/components/Flag';
import Link from 'next/link';
import type { Metadata } from 'next';

const SITE = 'https://stats.tennismylife.org';
const OG_IMAGE = `${SITE}/og/site-preview.png`;
const _title = 'Largest Year-End ATP Points Gap No. 1 vs No. 2 – Records';
const _description = 'The biggest year-end point differences between the ATP No. 1 and No. 2 players. Complete historical list by season.';
const _canonical = `${SITE}/recordsranking/diffpoints/endoftheseason`;
export const metadata: Metadata = {
  title: _title,
  description: _description,
  keywords: ['year-end ATP points gap', 'biggest year-end ATP points difference', 'ATP year-end ranking gap', 'tennis records', 'ATP history'],
  alternates: { canonical: _canonical },
  openGraph: { type: 'website', url: _canonical, siteName: 'TennisMyLife', title: _title, description: _description, images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: _title }] },
  twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title: _title, description: _description, images: [OG_IMAGE] },
  robots: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
  authors: [{ name: 'TennisMyLife' }],
};

export default async function YearEndDifferenceNo1No2({ searchParams }: { searchParams?: Promise<Record<string,string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/recordsranking/diffpoints/endoftheseason`, { cache: 'no-store' });
  const data = await res.json();
  const rows = Array.isArray(data) ? data : [];
  const allNames = [...new Set([...rows.map((r: any) => r.name), ...rows.map((r: any) => r.no2)].filter(Boolean))];
  const playerSlugs = allNames.length > 0 ? await prisma.player.findMany({ where: { atpname: { in: allNames } }, select: { atpname: true, slug: true } }) : [];
  const slugByName: Record<string, string | null> = Object.fromEntries(playerSlugs.map(p => [p.atpname ?? '', p.slug]));
  const toShow = rows.slice(0, 10);

  const renderTable = (list: any[]) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <caption className="py-2 text-sm font-semibold text-gray-400 uppercase tracking-wide">Record leaderboard</caption>
        <thead><tr className="bg-black"><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">No. 1 Player</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">No. 2 Player</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Points No. 1</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Points No. 2</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Points Diff.</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Year</th></tr></thead>
        <tbody>{list.map((r)=> (<tr key={r.year} className="hover:bg-gray-800 border-b border-white/10"><td className="border border-white/10 px-4 py-2 text-center text-gray-200 font-semibold">{r.rank}</td><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200"><div className="flex items-center justify-center gap-2">{r.country && <Flag ioc={r.country} className="w-4 h-3" />}{r.name && slugByName[r.name] ? <Link href={`/players/${slugByName[r.name]}/ranking`} className="hover:underline">{r.name}</Link> : <span>{r.name}</span>}</div></td><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-300"><div className="flex items-center justify-center gap-2">{r.country_no2 && <Flag ioc={r.country_no2} className="w-4 h-3" />}{r.no2 && slugByName[r.no2] ? <Link href={`/players/${slugByName[r.no2]}/ranking`} className="hover:underline">{r.no2}</Link> : <span>{r.no2}</span>}</div></td><td className="border border-white/10 px-4 py-2 text-center text-indigo-300">{r.points_no1.toLocaleString()}</td><td className="border border-white/10 px-4 py-2 text-center text-gray-400">{r.points_no2.toLocaleString()}</td><td className="border border-white/10 px-4 py-2 text-center text-green-400 font-semibold">{r.points_diff.toLocaleString()}</td><td className="border border-white/10 px-4 py-2 text-center text-gray-200">{r.year}</td></tr>))}</tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'ItemList',
        'url': 'https://stats.tennismylife.org/recordsranking/diffpoints/endoftheseason',
        'inLanguage': 'en-US',
        'isPartOf': { '@type': 'WebSite', 'name': 'TennisMyLife', 'url': 'https://stats.tennismylife.org' },
        'dateModified': new Date().toISOString(),
        'name': 'Largest Year-End ATP Points Gap No. 1 vs No. 2 – All-Time',
        'description': 'Historical records of the biggest year-end point differences between ATP No. 1 and No. 2.',
        'numberOfItems': Math.min(toShow.length, 10),
        'itemListElement': toShow.slice(0, 10).map((r: any, idx: number) => ({
          '@type': 'ListItem', 'position': idx + 1,
          'item': { '@type': 'SportsStatistic', 'name': r.name, ...(r.name && slugByName[r.name] ? { 'url': `https://stats.tennismylife.org/players/${slugByName[r.name]}/ranking` } : {}), 'additionalProperty': [
            { '@type': 'PropertyValue', 'name': 'Points Difference', 'value': r.points_diff },
            { '@type': 'PropertyValue', 'name': 'Year', 'value': r.year },
          ]},
        })),
      }) }} />

      {toShow.length > 0 && (
        <div className="mb-6 px-5 py-4 rounded-xl bg-gray-800/50 border border-white/10 text-gray-400 text-sm leading-relaxed max-w-3xl mx-auto">
          The largest year-end gap between No.{' '}<span className="text-white font-medium">1</span> and No.{' '}<span className="text-white font-medium">2</span> in the ATP rankings was{' '}
          <span className="text-white font-medium">{toShow[0].points_diff.toLocaleString()}</span> points:{' '}
          <span className="text-indigo-300 font-medium">{toShow[0].name}</span> led{' '}
          <span className="text-indigo-300 font-medium">{toShow[0].no2}</span> by that margin in{' '}
          <span className="text-white font-medium">{toShow[0].year}</span>.
        </div>
      )}

      {rows.length === 0 ? <div className="text-gray-400 py-4 text-center">No data available.</div> : renderTable(toShow)}
    </section>
  );
}