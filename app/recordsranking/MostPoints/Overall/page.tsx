import React from 'react';
import type { Metadata } from 'next';
import { prisma } from "@/lib/prisma";
import Flag from '@/components/Flag';
import Link from 'next/link';
import LastUpdateBanner from '@/components/LastUpdateBanner';
import ComparisonTableClient from './ComparisonTableClient';

export const metadata: Metadata = { title: 'Most ATP Points | ATP Ranking Records' };

interface No1MaxPointsItem {
  name: string;
  country: string; // IOC code
  points: number;
  date: string;
  slug?: string | null;
}


export default async function No1MaxPointsRanking({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  // replicate API logic server-side
  const grouped = await prisma.ranking.groupBy({ by: ["playerId"], _max: { points: true }, orderBy: [{ _max: { points: 'desc' } }], take: 100 });
  const playerIds = grouped.map(g => g.playerId);
  const playersRaw = await prisma.player.findMany({ where: { id: { in: playerIds } }, select: { id: true, atpname: true, ioc: true, slug: true } });
  const playersMap = new Map(playersRaw.map(p => [p.id, p]));
  const slugMap = new Map(playersRaw.map(p => [p.id, p.slug]));

  const candidates = await prisma.ranking.findMany({ where: { OR: grouped.map(g => ({ playerId: g.playerId, points: g._max.points! })) }, select: { playerId: true, points: true, rankingDate: { select: { date: true } }, player: { select: { atpname: true, ioc: true } } } });

  const candidateMap = new Map<string, typeof candidates[number]>();
  for (const row of candidates) {
    if (!candidateMap.has(row.playerId)) candidateMap.set(row.playerId, row);
  }

  const result: No1MaxPointsItem[] = grouped.map(g => {
    const row = candidateMap.get(g.playerId);
    return {
      name: row?.player?.atpname ?? playersMap.get(g.playerId)?.atpname ?? 'Unknown',
      country: row?.player?.ioc ?? playersMap.get(g.playerId)?.ioc ?? 'UNK',
      points: Number(g._max.points ?? 0),
      date: row?.rankingDate?.date ? row.rankingDate.date.toISOString().slice(0,10) : 'N/A',
      slug: slugMap.get(g.playerId) ?? null,
    };
  });

  const rows = result.slice(0, 20);
  const over10k = result.filter(r => r.points >= 10000).length;
  const over9k = result.filter(r => r.points >= 9000).length;

  const renderTable = (list: No1MaxPointsItem[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <caption className="py-2 text-sm font-semibold text-gray-400 uppercase tracking-wide">Record leaderboard</caption>
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Points</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Date</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r, idx) => (
            <tr
              key={`${r.name}-${r.date}-${idx}`}
              className="hover:bg-gray-800 border-b border-white/10"
            >
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{startIndex + idx + 1}</td>
              <td className={`border border-white/10 px-4 py-2 text-lg text-gray-200`}>
                <div className="flex flex-nowrap items-center justify-center gap-2 whitespace-nowrap">{r.country && <Flag ioc={r.country} className="w-4 h-3" />}{r.slug ? <Link href={`/players/${r.slug}/ranking`} className="hover:underline whitespace-nowrap">{r.name}</Link> : <span className="whitespace-nowrap">{r.name}</span>}</div>
              </td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">{r.points.toLocaleString()}</td>
              <td className="border border-white/10 px-4 py-2 text-gray-300">{r.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">

      <LastUpdateBanner />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Most ATP Points All-Time | ATP Ranking Records",
        "headline": "Highest ATP Ranking Points All-Time – Alcaraz Hits 13,650 in 2026",
        "description": "Highest career-high ATP ranking points in men's singles tennis history. Updated February 3, 2026 after Australian Open 2026.",
        "url": "https://stats.tennismylife.org/recordsranking/mostpoints/overall",
        "dateModified": new Date().toISOString(),
        "inLanguage": "en-US",
        "isPartOf": { "@type": "WebSite", "name": "TennisMyLife", "url": "https://stats.tennismylife.org" },
        "author": {
          "@type": "Organization",
          "name": "TennisMyLife Stats",
          "url": "https://stats.tennismylife.org"
        },
        "publisher": {
          "@type": "Organization",
          "name": "TennisMyLife",
          "logo": { "@type": "ImageObject", "url": "https://stats.tennismylife.org/logo.webp" }
        },
        "mainEntity": {
          "@type": "ItemList",
          "itemListOrder": "https://schema.org/ItemListOrderDescending",
          "numberOfItems": 10,
          "name": "All-Time Highest ATP Singles Ranking Points",
          "description": "Record of highest ATP ranking points achieved in men's singles (Open Era).",
          "itemListElement": rows.slice(0, 10).map((r, idx) => ({
            "@type": "ListItem",
            "position": idx + 1,
            "item": {
              "@type": "SportsStatistic",
              "name": "Highest ATP Points",
              ...(r.slug ? { "url": `https://stats.tennismylife.org/players/${r.slug}/ranking` } : {}),
              "additionalProperty": [
                { "@type": "PropertyValue", "name": "Player", "value": r.name },
                { "@type": "PropertyValue", "name": "Points", "value": r.points },
                { "@type": "PropertyValue", "name": "Date", "value": r.date },
                ...(String(r.name).toLowerCase().includes('alcaraz') ? [{ "@type": "PropertyValue", "name": "Note", "value": "Post-Australian Open 2026 - Career Grand Slam completed" }] : [])
              ]
            }
          }))
        }
      }) }} />

      {rows.length > 0 && (
        <div className="mb-6 px-5 py-4 rounded-xl bg-gray-800/50 border border-white/10 text-gray-400 text-sm leading-relaxed max-w-3xl mx-auto">
          The highest ATP ranking points ever recorded in the Open Era is{' '}
          <span className="gold-number">{rows[0].points.toLocaleString()}</span> points, achieved by{' '}
          <span className="inline-flex items-center gap-1 text-indigo-300 font-medium">
            {rows[0].country && <Flag ioc={rows[0].country} className="w-4 h-3" />}{rows[0].name}
          </span>{' '}
          on <span className="text-white font-medium">{rows[0].date}</span>.
          {rows.length > 1 && (
            <> Second all-time is <span className="inline-flex items-center gap-1 text-indigo-300 font-medium">
              {rows[1].country && <Flag ioc={rows[1].country} className="w-4 h-3" />}{rows[1].name}
            </span>{' '}
            with <span className="gold-number">{rows[1].points.toLocaleString()}</span> points.</>
          )}
          {rows.length > 2 && (
            <> Third is <span className="inline-flex items-center gap-1 text-indigo-300 font-medium"><Flag ioc="ITA" className="w-4 h-3" /> Jannik Sinner</span>{' '}
            with <span className="gold-number">14,350</span> points.</>
          )}
          {over10k > 0 && (
            <>{' '}Only <span className="gold-number">{over10k}</span> player{over10k > 1 ? 's have' : ' has'} ever surpassed the 10,000-point mark.</>
          )}
          {over9k > over10k && (
            <>{' '}<span className="gold-number">{over9k}</span> have exceeded 9,000 points in total.</>
          )}

          <br />
          <br />
          Based on the current ranking, <span className="inline-flex items-center gap-1"><Flag ioc="SUI" className="w-4 h-3" />Federer</span> would have <span className="gold-number">15,730</span> points, while under the system used in 2009 he would have <span className="gold-number">15,495</span>.{' '}
          <span className="inline-flex items-center gap-1"><Flag ioc="SRB" className="w-4 h-3" />Djokovic</span> would still be first under the current system, increasing the total to <span className="gold-number">17,150</span>.
        </div>
      )}

      <div className="mb-8 overflow-x-auto overflow-y-visible rounded border border-white/30 bg-gray-900 shadow">
        <h2 className="py-2 text-sm font-semibold text-gray-400 uppercase tracking-wide text-center">ATP Points Comparison</h2>
        <ComparisonTableClient />
      </div>
      {rows.length > 0 ? renderTable(rows, 0) : (<div className="text-gray-400 py-4 text-center">No data available.</div>)}
    </section>
  );
}