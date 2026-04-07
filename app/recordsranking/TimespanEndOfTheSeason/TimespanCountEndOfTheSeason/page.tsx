import React from 'react';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import Flag from '@/components/Flag';
import Link from 'next/link';
import DropdownNavSelect from '@/components/DropdownNavSelect';

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const rank = Number((sp.rank as string) ?? 1);
  const SITE = 'https://stats.tennismylife.org';
  const OG_IMAGE = `${SITE}/og/site-preview.png`;
  const title = `Longest Year-End Career Span at ATP No. ${rank} – Records`;
  const description = `Which players appeared at ATP No. ${rank} at year-end over the longest period? All-time historical list with first and last year.`;
  const canonical = `${SITE}/recordsranking/timespanendoftheseason/atno/${rank}`;
  return {
    title,
    description,
    keywords: [`year-end span ATP No. ${rank}`, 'ATP year-end timespan', 'longest career year-end No 1', 'tennis records', 'ATP history'],
    alternates: { canonical },
    openGraph: { type: 'website', url: canonical, siteName: 'TennisMyLife', title, description, images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title, description, images: [OG_IMAGE] },
    robots: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
    authors: [{ name: 'TennisMyLife' }],
  };
}

function diffYMD(birth: Date, ref: Date) {
  let y = ref.getUTCFullYear() - birth.getUTCFullYear();
  let m = ref.getUTCMonth() - birth.getUTCMonth();
  let d = ref.getUTCDate() - birth.getUTCDate();
  if (d < 0) { const prev = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 0)); d += prev.getUTCDate(); m -= 1; }
  if (m < 0) { m += 12; y -= 1; }
  return { y, m, d };
}

export default async function EoyRankTimespan({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const rank = Number((sp.rank as string) ?? 1);

  if (!Number.isInteger(rank) || rank < 1) {
    return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">Invalid 'rank' param</div></section>);
  }

  const allDates = await prisma.rankingDate.findMany({ select: { date: true }, orderBy: { date: 'asc' } });
  const years = Array.from(new Set(allDates.map(d => d.date.getUTCFullYear())));
  if (years.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const lastPerYear = await Promise.all(years.map(async (year) => { const last = await prisma.rankingDate.findFirst({ where: { date: { gte: new Date(Date.UTC(year,0,1)), lt: new Date(Date.UTC(year+1,0,1)) } }, orderBy: { date: 'desc' }, select: { id: true } }); return last?.id ?? null; }));
  const ids = lastPerYear.filter((x): x is number => x !== null);
  if (ids.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const rowsData = await prisma.ranking.findMany({ where: { rank, rankingDateId: { in: ids } }, select: { playerId: true, player: { select: { atpname: true, ioc: true, slug: true } }, rankingDate: { select: { date: true } } } });
  if (rowsData.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const byPlayer = new Map<string, { name: string; ioc: string | null; min: Date; max: Date; slug: string | null }>();
  for (const r of rowsData) {
    const id = String(r.playerId);
    const d = r.rankingDate.date;
    const name = r.player?.atpname ?? null;
    if (!name) continue;
    const ioc = r.player?.ioc ?? null;
    const slug = r.player?.slug ?? null;
    const prev = byPlayer.get(id);
    if (!prev) byPlayer.set(id, { name, ioc, min: d, max: d, slug }); else { if (d < prev.min) prev.min = d; if (d > prev.max) prev.max = d; }
  }

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const data = Array.from(byPlayer.entries()).map(([id, v]) => { const timespanDays = Math.max(0, Math.floor((v.max.getTime() - v.min.getTime()) / MS_PER_DAY)); const { y,m,d } = diffYMD(v.min, v.max); return { id, name: v.name, ioc: v.ioc, firstYear: v.min.getUTCFullYear(), lastYear: v.max.getUTCFullYear(), spanYears: Math.max(0, v.max.getUTCFullYear() - v.min.getUTCFullYear()), timespanDays, timespanLabel: `${y}y ${m}m ${d}d`, slug: v.slug } }).sort((a,b) => b.timespanDays - a.timespanDays || b.lastYear - a.lastYear || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

  const rows = data.slice(0, 20);

  const renderTable = (list: typeof rows) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <caption className="py-2 text-sm font-semibold text-gray-400 uppercase tracking-wide">Record leaderboard</caption>
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Timespan (years)</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">First year</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Last year</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r, idx) => (
            <tr key={`${r.id}-${r.firstYear}-${r.lastYear}`} className="hover:bg-gray-800 border-b border-white/10">
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{idx+1}</td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                <div className="flex items-center justify-center gap-2">{r.ioc && <Flag ioc={r.ioc} className="w-4 h-3" />}{r.slug ? <Link href={`/players/${r.slug}/ranking`} className="hover:underline">{r.name}</Link> : <span>{r.name}</span>}</div>
              </td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">{r.spanYears}</td>
              <td className="border border-white/10 px-4 py-2 text-center text-gray-300">{r.firstYear}</td>
              <td className="border border-white/10 px-4 py-2 text-center text-gray-300">{r.lastYear}</td>
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
        'url': `https://stats.tennismylife.org/recordsranking/timespanendoftheseason/atno/${rank}`,
        'inLanguage': 'en-US',
        'isPartOf': { '@type': 'WebSite', 'name': 'TennisMyLife', 'url': 'https://stats.tennismylife.org' },
        'dateModified': new Date().toISOString(),
        'name': `Longest Year-End Career Span at ATP No. ${rank} – All-Time`,
        'description': `Players who appeared at ATP No. ${rank} at year-end over the longest period of years.`,
        'numberOfItems': Math.min(rows.length, 10),
        'itemListElement': rows.slice(0, 10).map((r, idx) => ({
          '@type': 'ListItem', 'position': idx + 1,
          'item': { '@type': 'SportsStatistic', 'name': r.name, ...(r.slug ? { 'url': `https://stats.tennismylife.org/players/${r.slug}/ranking` } : {}), 'additionalProperty': [
            { '@type': 'PropertyValue', 'name': 'Span (years)', 'value': r.spanYears },
            { '@type': 'PropertyValue', 'name': 'First Year', 'value': r.firstYear },
            { '@type': 'PropertyValue', 'name': 'Last Year', 'value': r.lastYear },
          ]},
        })),
      }) }} />
      <div className="flex items-center justify-between mb-4">
        <div>
          <label className="text-gray-200 font-medium mr-2">Rank (EOY):</label>
          <DropdownNavSelect name="rank" value={String(rank)} options={Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `No. ${i + 1}` }))} pathMode />
        </div>
      </div>

      {rows.length > 0 && (
        <div className="mb-6 px-5 py-4 rounded-xl bg-gray-800/50 border border-white/10 text-gray-400 text-sm leading-relaxed max-w-3xl mx-auto">
          The longest year-end career span at No.{' '}<span className="text-white font-medium">{rank}</span> in ATP history belongs to{' '}
          <span className="text-indigo-300 font-medium">{rows[0].name}</span>:{' '}
          <span className="text-white font-medium">{rows[0].spanYears}</span> seasons, from{' '}
          <span className="text-white font-medium">{rows[0].firstYear}</span> to{' '}
          <span className="text-white font-medium">{rows[0].lastYear}</span>.
          {rows.length > 1 && (
            <> Second is <span className="text-indigo-300 font-medium">{rows[1].name}</span>{' '}
            (<span className="text-white font-medium">{rows[1].spanYears}</span> seasons).</>
          )}
        </div>
      )}

      {rows.length > 0 ? renderTable(rows) : (<div className="text-gray-400 py-4 text-center">No data available.</div>)}
    </section>
  );
}
