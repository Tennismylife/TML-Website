import React from 'react';
import type { Metadata } from 'next';
import Flag from '@/components/Flag';
import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import RecordsTopControls from '../../Top/RecordsTopControls';
import ServerPagination from '@/components/ServerPagination';

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const top = Number((sp.top as string) ?? 5);
  const page = Number((sp.page as string) ?? '1');
  const SITE = 'https://stats.tennismylife.org';
  const OG_IMAGE = `${SITE}/og/site-preview.png`;
  const title = `Longest Career Span in ATP Top ${top} – All-Time Records`;
  const description = `Which players had the longest career span inside the ATP Top ${top}? Historical list showing first and last date.`;
  const canonical = `${SITE}/recordsranking/timespan/attop/${top}`;
  return {
    title,
    description,
    keywords: [`career span ATP Top ${top}`, 'ATP ranking timespan', 'longest time in Top 10', 'tennis ranking records', 'ATP history'],
    alternates: { canonical },
    openGraph: { type: 'website', url: canonical, siteName: 'TennisMyLife', title, description, images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title, description, images: [OG_IMAGE] },
    robots: page > 1 ? { index: false, follow: true } : { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
    authors: [{ name: 'TennisMyLife' }],
  };
}

function diffYMD(a: Date, b: Date) {
  let y = b.getUTCFullYear() - a.getUTCFullYear();
  let m = b.getUTCMonth() - a.getUTCMonth();
  let d = b.getUTCDate() - a.getUTCDate();
  if (d < 0) {
    const prevMonth = new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0));
    d += prevMonth.getUTCDate();
    m -= 1;
  }
  if (m < 0) {
    m += 12;
    y -= 1;
  }
  return { y, m, d };
}

export default async function TopXTimespan({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const top = Number((sp.top as string) ?? 5);
  const eoy = (sp.eoy as string) === '1';

  const fromYear = sp.fromYear ? Number(sp.fromYear as string) : null;
  const toYear = sp.toYear ? Number(sp.toYear as string) : null;
  const limit = 200;

  if (!Number.isInteger(top) || top < 1) {
    return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">Invalid 'top' param</div></section>);
  }

  const dateBounds: any = {};
  if (fromYear !== null) dateBounds.gte = new Date(Date.UTC(fromYear, 0, 1));
  if (toYear !== null)   dateBounds.lt  = new Date(Date.UTC(toYear + 1, 0, 1));

  let targetRankingDateIds: number[] | null = null;
  if (eoy) {
    const allDates = await prisma.rankingDate.findMany({ where: Object.keys(dateBounds).length ? { date: dateBounds } : undefined, select: { date: true }, orderBy: { date: 'asc' } });
    const years = Array.from(new Set(allDates.map(d => d.date.getUTCFullYear())));
    if (years.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);
    const lastPerYear = await Promise.all(years.map(async (year) => {
      const last = await prisma.rankingDate.findFirst({ where: { date: { gte: new Date(Date.UTC(year,0,1)), lt: new Date(Date.UTC(year+1,0,1)) } }, orderBy: { date: 'desc' }, select: { id: true } });
      return last?.id ?? null;
    }));
    targetRankingDateIds = lastPerYear.filter((x): x is number => x !== null);
    if (targetRankingDateIds.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);
  }

  const rows = await prisma.ranking.findMany({ where: { rank: { lte: top }, ...(targetRankingDateIds ? { rankingDateId: { in: targetRankingDateIds } } : (Object.keys(dateBounds).length ? { rankingDate: { date: dateBounds } } : {})) }, select: { playerId: true, player: { select: { atpname: true, ioc: true } }, rankingDate: { select: { date: true } } } });

  if (rows.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const allPlayerIds = Array.from(new Set(rows.map(r => String(r.playerId))));
  const players = await prisma.player.findMany({ where: { id: { in: allPlayerIds } }, select: { id: true, atpname: true, ioc: true, slug: true } });
  const playerMap = Object.fromEntries(players.map(p => [p.id, p]));

  type Agg = { name: string; ioc: string | null; min: Date; max: Date; slug: string | null };
  const byPlayer = new Map<string, Agg>();

  for (const r of rows) {
    const id = String(r.playerId);
    const d = r.rankingDate.date;
    const name = r.player?.atpname ?? playerMap[id]?.atpname ?? null;
    if (!name) continue;
    const ioc = r.player?.ioc ?? playerMap[id]?.ioc ?? null;
    const slug = playerMap[id]?.slug ?? null;
    const prev = byPlayer.get(id);
    if (!prev) byPlayer.set(id, { name, ioc, min: d, max: d, slug });
    else { if (d < prev.min) prev.min = d; if (d > prev.max) prev.max = d; }
  }

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const data = Array.from(byPlayer.entries()).map(([id, v]) => {
    const timespanDays = Math.max(0, Math.floor((v.max.getTime() - v.min.getTime()) / MS_PER_DAY));
    const { y,m,d } = diffYMD(v.min, v.max);
    return { id, name: v.name, ioc: v.ioc, firstDate: v.min.toISOString().slice(0,10), lastDate: v.max.toISOString().slice(0,10), timespanDays, timespanLabel: `${y}y ${m}m ${d}d`, slug: v.slug };
  }).sort((a,b) => b.timespanDays - a.timespanDays || b.lastDate.localeCompare(a.lastDate) || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })).slice(0, limit);

  const rowsToShow = data.slice(0, 20);
  const longSpan = data.filter(r => r.timespanDays > 10 * 365).length;
  const perPage = 20;
  const page = Number((sp.page as string) ?? 1);
  const totalPages = Math.ceil(data.length / perPage);
  const start = (page - 1) * perPage;
  const pageRows = data.slice(start, start + perPage);

  const renderTable = (list: any[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <caption className="py-2 text-sm font-semibold text-gray-400 uppercase tracking-wide">Record leaderboard</caption>
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">#</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Span</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">First</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Last</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r, idx) => (
            <tr key={r.id} className="hover:bg-gray-800 border-b border-white/10">
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{startIndex + idx + 1}</td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200"><div className="flex items-center justify-center gap-2">{r.ioc && <Flag ioc={r.ioc} className="w-4 h-3" />}{r.slug ? <Link href={`/players/${r.slug}/ranking`} className="hover:underline">{r.name}</Link> : <span>{r.name}</span>}</div></td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">{r.timespanLabel}</td>
              <td className="border border-white/10 px-4 py-2 text-center text-gray-300">{r.firstDate}</td>
              <td className="border border-white/10 px-4 py-2 text-center text-gray-300">{r.lastDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const baseQuery = (q: URLSearchParams) => {
    if (eoy) q.set('eoy','1');
    if (fromYear !== null) q.set('fromYear',String(fromYear));
    if (toYear !== null) q.set('toYear',String(toYear));
    return q.toString() ? `?${q.toString()}` : '';
  }

  return (
    <section className="mb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'ItemList',
        'url': `https://stats.tennismylife.org/recordsranking/timespan/attop/${top}`,
        'inLanguage': 'en-US',
        'isPartOf': { '@type': 'WebSite', 'name': 'TennisMyLife', 'url': 'https://stats.tennismylife.org' },
        'dateModified': new Date().toISOString(),
        'name': `Longest Career Span in ATP Top ${top} – All-Time`,
        'description': `Players with the longest career timespan inside the ATP Top ${top}.`,
        'numberOfItems': Math.min(data.length, 10),
        'itemListElement': data.slice(0, 10).map((r, idx) => ({
          '@type': 'ListItem', 'position': idx + 1,
          'item': { '@type': 'SportsStatistic', 'name': r.name, ...(r.slug ? { 'url': `https://stats.tennismylife.org/players/${r.slug}/ranking` } : {}), 'additionalProperty': [
            { '@type': 'PropertyValue', 'name': 'Timespan', 'value': r.timespanLabel },
            { '@type': 'PropertyValue', 'name': 'First Date', 'value': r.firstDate },
            { '@type': 'PropertyValue', 'name': 'Last Date', 'value': r.lastDate },
          ]},
        })),
      }) }} />
      <React.Suspense fallback={<div className="text-gray-400 py-2 text-center">Loading controls...</div>}>
        <RecordsTopControls initialTop={top} />
      </React.Suspense>

      {page === 1 && data.length > 0 && (
        <div className="mb-6 px-5 py-4 rounded-xl bg-gray-800/50 border border-white/10 text-gray-400 text-sm leading-relaxed max-w-3xl mx-auto">
          The longest career span inside the ATP Top{' '}<span className="text-white font-medium">{top}</span> belongs to{' '}
          <span className="text-indigo-300 font-medium">{data[0].name}</span>:{' '}
          <span className="text-white font-medium">{data[0].timespanLabel}</span>, from{' '}
          <span className="text-white font-medium">{data[0].firstDate}</span> to{' '}
          <span className="text-white font-medium">{data[0].lastDate}</span>.
          {data.length > 1 && (
            <> Second is <span className="text-indigo-300 font-medium">{data[1].name}</span>{' '}
            (<span className="text-white font-medium">{data[1].timespanLabel}</span>).</>
          )}
          {data.length > 2 && (
            <> Third is <span className="text-indigo-300 font-medium">{data[2].name}</span>{' '}
            (<span className="text-white font-medium">{data[2].timespanLabel}</span>).</>
          )}
          {' '}<span className="text-white font-medium">{data.length}</span> players feature in this all-time list.
          {longSpan > 0 && (
            <>{' '}<span className="text-white font-medium">{longSpan}</span> of them had a career span of over 10 years inside the Top{' '}
            <span className="text-white font-medium">{top}</span>.</>
          )}
        </div>
      )}

      {pageRows.length > 0 ? renderTable(pageRows, start) : (<div className="text-gray-400 py-4 text-center">No data available.</div>)}



      {totalPages > 1 && (
        <ServerPagination page={page} totalPages={totalPages} getHref={(p) => `?top=${top}${eoy ? '&eoy=1' : ''}${fromYear !== null ? `&fromYear=${fromYear}` : ''}${toYear !== null ? `&toYear=${toYear}` : ''}${p > 1 ? `&page=${p}` : ''}`} />
      )}
    </section>
  );
}



