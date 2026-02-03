import React from 'react';
import type { Metadata } from 'next';
import { prisma } from "@/lib/prisma";
import Flag from '@/components/Flag';
import LastUpdateBanner from '@/components/LastUpdateBanner';

export const metadata: Metadata = { title: 'Most ATP Points | ATP Ranking Records' };

interface No1MaxPointsItem {
  name: string;
  country: string; // IOC code
  points: number;
  date: string;
}


export default async function No1MaxPointsRanking({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  // replicate API logic server-side
  const grouped = await prisma.ranking.groupBy({ by: ["playerId"], _max: { points: true }, orderBy: [{ _max: { points: 'desc' } }], take: 100 });
  const playerIds = grouped.map(g => g.playerId);
  const playersRaw = await prisma.player.findMany({ where: { id: { in: playerIds } }, select: { id: true, atpname: true, ioc: true } });
  const playersMap = new Map(playersRaw.map(p => [p.id, p]));

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
    };
  });

  const rows = result.slice(0, 20);

  const renderTable = (list: No1MaxPointsItem[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Points</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Date</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r, idx) => (
            <tr
              key={`${r.name}-${r.date}-${idx}`}
              className={`${startIndex + idx + 1 === 3 && String(r.name).toLowerCase().includes('alcaraz') ? 'bg-yellow-900/30 border-l-4 border-yellow-400' : ''} hover:bg-gray-800 border-b border-white/10`}
            >
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{startIndex + idx + 1}</td>
              <td className={`border border-white/10 px-4 py-2 text-lg ${startIndex + idx + 1 === 3 && String(r.name).toLowerCase().includes('alcaraz') ? 'text-yellow-300 font-bold' : 'text-gray-200'}`}>
                <div className="flex items-center gap-2">{r.country && <Flag ioc={r.country} className="w-4 h-3" />}<span>{r.name}</span></div>
              </td>
              <td className={`border border-white/10 px-4 py-2 text-center text-lg ${startIndex + idx + 1 === 3 && String(r.name).toLowerCase().includes('alcaraz') ? 'text-yellow-200 font-semibold' : 'text-indigo-300'}`}>{r.points.toLocaleString()}</td>
              <td className={`border border-white/10 px-4 py-2 ${startIndex + idx + 1 === 3 && String(r.name).toLowerCase().includes('alcaraz') ? 'text-yellow-200' : 'text-gray-300'}`}>{r.date}</td>
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
        "dateModified": "2026-02-03",
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
              "additionalProperty": [
                { "@type": "PropertyValue", "name": "Player", "value": r.name },
                { "@type": "PropertyValue", "name": "Points", "value": r.points },
                { "@type": "PropertyValue", "name": "Date", "value": r.date },
                ...(String(r.name).toLowerCase().includes('alcaraz') ? [{ "@type": "PropertyValue", "name": "Note", "value": "Post-Australian Open 2026 - Career Grand Slam completed; also the youngest player in history to complete the Career Grand Slam" }] : [])
              ]
            }
          }))
        }
      }) }} />

      {rows.length > 0 ? renderTable(rows, 0) : (<div className="text-gray-400 py-4 text-center">No data available.</div>)}
    </section>
  );
}