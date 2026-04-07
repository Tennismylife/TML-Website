import React from 'react';
import { prisma } from "@/lib/prisma";
import ServerPagination from '@/components/ServerPagination';
import Flag from '@/components/Flag';
import Link from 'next/link';
import OldestCountControls from "./OldestCountControls";

interface OldestItem {
  id: string;
  name: string;
  ioc?: string | null;
  ageDays: number;
  ageLabel: string; // "37y 2m 14d"
  date: string;     // "YYYY-MM-DD"
  slug?: string | null;
}

function diffYMD(birth: Date, ref: Date) {
  let y = ref.getUTCFullYear() - birth.getUTCFullYear();
  let m = ref.getUTCMonth() - birth.getUTCMonth();
  let d = ref.getUTCDate() - birth.getUTCDate();
  if (d < 0) {
    const prevMonth = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 0));
    d += prevMonth.getUTCDate();
    m -= 1;
  }
  if (m < 0) {
    m += 12;
    y -= 1;
  }
  return { y, m, d };
}

import type { Metadata } from 'next';

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const rank = Number((sp.rank as string) ?? 1);
  const page = Number((sp.page as string) ?? '1');
  const SITE = 'https://stats.tennismylife.org';
  const OG_IMAGE = `${SITE}/og/site-preview.png`;
  const title = `Oldest Players Ever at ATP No. ${rank} – All-Time Records`;
  const description = `Who are the oldest players to reach ATP No. ${rank} in the rankings? Complete all-time list ordered by age.`;
  const canonical = `${SITE}/recordsranking/ages/oldestsatno/${rank}`;
  return {
    title,
    description,
    keywords: [`oldest ATP No. ${rank}`, 'oldest tennis player ranking', 'ATP records by age', 'ATP history', 'tennis records'],
    alternates: { canonical },
    openGraph: { type: 'website', url: canonical, siteName: 'TennisMyLife', title, description, images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title, description, images: [OG_IMAGE] },
    robots: page > 1 ? { index: false, follow: true } : { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
    authors: [{ name: 'TennisMyLife' }],
  };
}

export default async function OldestAtRank({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const rank = Number((sp.rank as string) ?? 1);
  const limit = Math.min(500, Math.max(1, Number((sp.limit as string) ?? 200)));

  let rankings: Array<any> = [];
  try {
    rankings = await prisma.ranking.findMany({
      where: {
        rank,
        ...(sp.fromYear || sp.toYear
          ? { rankingDate: { date: {
              ...(sp.fromYear ? { gte: new Date(Date.UTC(Number(sp.fromYear as string), 0, 1)) } : {}),
              ...(sp.toYear ? { lt: new Date(Date.UTC(Number(sp.toYear as string) + 1, 0, 1)) } : {}),
            } } }
          : {}),
      },
      select: { playerId: true, player: { select: { atpname: true, ioc: true, birthdate: true, slug: true } }, rankingDate: { select: { date: true } } }
    });
  } catch (err) {
    console.error('OldestCount page: DB error fetching rankings', err);
    // fail safe: render empty dataset so build/export does not crash
    rankings = [];
  }

  const bestByPlayer = new Map<string, { name: string; ioc: string | null; date: Date; birth: Date; ageDays: number; slug: string | null }>();

  for (const r of rankings) {
    if (!r.player) continue;
    const id = String(r.playerId);
    const birth = r.player.birthdate;
    if (!birth) continue;
    const date = r.rankingDate.date;
    if (date < birth) continue;

    const ageDays = Math.floor((date.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    const prev = bestByPlayer.get(id);
    if (!prev || ageDays > prev.ageDays || (ageDays === prev.ageDays && date > prev.date)) {
      bestByPlayer.set(id, { name: r.player.atpname, ioc: r.player.ioc, date, birth, ageDays, slug: r.player.slug ?? null });
    }
  }

  const totalCount = bestByPlayer.size;
  const data: OldestItem[] = Array.from(bestByPlayer.entries()).map(([id, v]) => {
    const { y, m, d } = diffYMD(v.birth, v.date);
    return { id, name: v.name, ioc: v.ioc, ageDays: v.ageDays, ageLabel: `${y}y ${m}m ${d}d`, date: v.date.toISOString().slice(0, 10), slug: v.slug };
  }).sort((a, b) => b.ageDays - a.ageDays || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })).slice(0, limit);
  const over35 = data.filter(r => r.ageDays >= 35 * 365).length;

  const perPage = 20;
  const page = Number((sp.page as string) ?? '1');
  const totalPages = Math.ceil(data.length / perPage);
  const start = (page - 1) * perPage;
  const paginatedRows = data.slice(start, start + perPage);

  const renderTable = (list: OldestItem[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <caption className="py-2 text-sm font-semibold text-gray-400 uppercase tracking-wide">Record leaderboard</caption>
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Age at No. {rank}</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Date</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r, idx) => (
            <tr key={`${r.id}-${r.date}`} className="hover:bg-gray-800 border-b border-white/10">
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{startIndex + idx + 1}</td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200"><div className="flex items-center justify-center gap-2">{r.ioc && <Flag ioc={r.ioc} className="w-4 h-3" /> }{r.slug ? <Link href={`/players/${r.slug}/ranking`} className="hover:underline">{r.name}</Link> : <span>{r.name}</span>}</div></td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">{r.ageLabel}</td>
              <td className="border border-white/10 px-4 py-2 text-center text-gray-300">{r.date}</td>
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
        'url': `https://stats.tennismylife.org/recordsranking/ages/oldestsatno/${rank}`,
        'inLanguage': 'en-US',
        'isPartOf': { '@type': 'WebSite', 'name': 'TennisMyLife', 'url': 'https://stats.tennismylife.org' },
        'dateModified': new Date().toISOString(),
        'name': `Oldest Players at ATP No. ${rank} – All-Time`,
        'description': `Oldest ATP No. ${rank} holders by age on the date they last reached that ranking.`,
        'numberOfItems': Math.min(data.length, 10),
        'itemListElement': data.slice(0, 10).map((r, idx) => ({
          '@type': 'ListItem', 'position': idx + 1,
          'item': { '@type': 'SportsStatistic', 'name': r.name, ...(r.slug ? { 'url': `https://stats.tennismylife.org/players/${r.slug}/ranking` } : {}), 'additionalProperty': [
            { '@type': 'PropertyValue', 'name': 'Age', 'value': r.ageLabel },
            { '@type': 'PropertyValue', 'name': 'Date', 'value': r.date },
          ]},
        })),
      }) }} />
      <React.Suspense fallback={<div className="text-gray-400 py-2 text-center">Loading controls...</div>}>
        <OldestCountControls initialRank={rank} />
      </React.Suspense>

      {page === 1 && data.length > 0 && (
        <div className="mb-6 px-5 py-4 rounded-xl bg-gray-800/50 border border-white/10 text-gray-400 text-sm leading-relaxed max-w-3xl mx-auto">
          The oldest player ever to reach No.{' '}<span className="text-white font-medium">{rank}</span> in the ATP rankings is{' '}
          <span className="text-indigo-300 font-medium">{data[0].name}</span>, who appeared at that ranking at the age of{' '}
          <span className="text-white font-medium">{data[0].ageLabel}</span> on{' '}
          <span className="text-white font-medium">{data[0].date}</span>.
          {data.length > 1 && (
            <> The second oldest is <span className="text-indigo-300 font-medium">{data[1].name}</span>{' '}
            (<span className="text-white font-medium">{data[1].ageLabel}</span>).</>
          )}
          {data.length > 2 && (
            <> Third is <span className="text-indigo-300 font-medium">{data[2].name}</span>{' '}
            (<span className="text-white font-medium">{data[2].ageLabel}</span>).</>
          )}
          {' '}In total, <span className="text-white font-medium">{totalCount}</span> different players have ever held that ranking.
          {over35 > 0 && (
            <>{' '}<span className="text-white font-medium">{over35}</span> of them were 35 or older at their last appearance at No.{' '}
            <span className="text-white font-medium">{rank}</span>.</>
          )}
        </div>
      )}

      {paginatedRows.length > 0 ? renderTable(paginatedRows, start) : (<div className="text-gray-400 py-4 text-center">No data available.</div>)}

      {totalPages > 1 && (
        <ServerPagination page={page} totalPages={totalPages} getHref={(p) => `?rank=${rank}&page=${p}`} />
      )}
    </section>
  );
}
