import { prisma } from "@/lib/prisma";
import Flag from '@/components/Flag';
import Link from 'next/link';
import React from 'react';
import RecordsTopControls from '../../Top/RecordsTopControls';
import ServerPagination from '@/components/ServerPagination';
import type { Metadata } from 'next';

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const top = Number((Array.isArray(sp.top) ? sp.top[0] : sp.top) ?? (Array.isArray(sp.rank) ? sp.rank[0] : sp.rank) ?? 2);
  const page = Number((sp.page as string) ?? '1');
  const SITE = 'https://stats.tennismylife.org';
  const OG_IMAGE = `${SITE}/og/site-preview.png`;
  const title = `Oldest Year-End ATP Top ${top} – Age Records`;
  const description = `Who are the oldest players to finish a season inside the ATP Top ${top}? All-time historical list ordered by age.`;
  const canonical = `${SITE}/recordsranking/agesendoftheseason/oldestattop/${top}`;
  return {
    title,
    description,
    keywords: [`oldest year-end Top ${top}`, 'ATP year-end age records', 'oldest year-end ATP', 'tennis records by age', 'ATP history'],
    alternates: { canonical },
    openGraph: { type: 'website', url: canonical, siteName: 'TennisMyLife', title, description, images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title, description, images: [OG_IMAGE] },
    robots: page > 1 ? { index: false, follow: true } : { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
    authors: [{ name: 'TennisMyLife' }],
  };
}

interface OldestEoyTopItem {
  id: string;
  name: string;
  ioc?: string | null;
  ageDays: number;
  ageLabel: string; // "37y 2m 14d"
  year: number;     // solo anno
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

export default async function OldestEoyTop({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const initialTop = Number((sp.top as string) ?? (sp.rank as string) ?? 2);
  const top = initialTop;
  const limit = Math.min(500, Math.max(1, Number((sp.limit as string) ?? 200)));

  // years
  const fromYearParam = sp.fromYear as string | undefined;
  const toYearParam = sp.toYear as string | undefined;
  const fromYear = fromYearParam ? Number(fromYearParam) : null;
  const toYear = toYearParam ? Number(toYearParam) : null;

  const dateWhere: any = {};
  if (fromYear !== null) dateWhere.gte = new Date(Date.UTC(fromYear, 0, 1));
  if (toYear !== null) dateWhere.lt  = new Date(Date.UTC(toYear + 1, 0, 1));

  const allDates = await prisma.rankingDate.findMany({ where: Object.keys(dateWhere).length ? { date: dateWhere } : undefined, select: { date: true }, orderBy: { date: 'asc' } });
  const years = Array.from(new Set(allDates.map(d => d.date.getUTCFullYear())));
  if (years.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const lastPerYear = await Promise.all(years.map(async (year) => {
    const last = await prisma.rankingDate.findFirst({ where: { date: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } }, orderBy: { date: 'desc' }, select: { id: true, date: true } });
    return last ? { year, id: last.id, date: last.date } : null;
  }));

  const last = (lastPerYear.filter(Boolean) as { year: number; id: number; date: Date }[]);
  if (last.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const eoyIds = last.map(x => x.id);
  const yearById = new Map<number, number>(last.map(x => [x.id, x.year]));

  const rowsData = await prisma.ranking.findMany({
    where: { rank: { lte: top }, rankingDateId: { in: eoyIds } },
    select: { playerId: true, player: { select: { atpname: true, ioc: true, birthdate: true, slug: true } }, rankingDateId: true, rankingDate: { select: { date: true } } },
  });

  const bestByPlayer = new Map<string, { name: string; ioc: string | null; year: number; date: Date; birth: Date; ageDays: number; slug: string | null }>();
  for (const r of rowsData) {
    if (!r.player) continue;
    const id = String(r.playerId);
    const birth = r.player.birthdate;
    if (!birth) continue;
    const ref = r.rankingDate.date;
    if (ref < birth) continue;

    const ageDays = Math.floor((ref.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    const recYear = yearById.get(r.rankingDateId)!;

    const prev = bestByPlayer.get(id);
    if (!prev || ageDays > prev.ageDays || (ageDays === prev.ageDays && ref < prev.date)) {
      bestByPlayer.set(id, { name: r.player.atpname ?? '', ioc: r.player.ioc, year: recYear, date: ref, birth, ageDays, slug: r.player.slug ?? null });
    }
  }

  const data: OldestEoyTopItem[] = Array.from(bestByPlayer.entries()).map(([id, v]) => {
    const { y, m, d } = diffYMD(v.birth, v.date);
    return { id, name: v.name, ioc: v.ioc, ageDays: v.ageDays, ageLabel: `${y}y ${m}m ${d}d`, year: v.year, slug: v.slug };
  }).sort((a, b) => b.ageDays - a.ageDays).slice(0, limit);

  const perPage = 20;
  const page = Number((sp.page as string) ?? '1');
  const totalPages = Math.ceil(data.length / perPage);
  const start = (page - 1) * perPage;
  const paginatedRows = data.slice(start, start + perPage);

  const renderTable = (list: OldestEoyTopItem[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <caption className="py-2 text-sm font-semibold text-gray-400 uppercase tracking-wide">Record leaderboard</caption>
        <thead>
          <tr className="bg-black"><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Top</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Age at EOY Top {top}</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Year</th></tr>
        </thead>
        <tbody>
          {list.map((r, idx) => (
            <tr key={`${r.id}-${r.year}`} className="hover:bg-gray-800 border-b border-white/10">
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{startIndex + idx + 1}</td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200"><div className="flex items-center justify-center gap-2">{r.ioc && <Flag ioc={r.ioc} className="w-4 h-3" />}{r.slug ? <Link href={`/players/${r.slug}/ranking`} className="hover:underline">{r.name}</Link> : <span>{r.name}</span>}</div></td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">{r.ageLabel}</td>
              <td className="border border-white/10 px-4 py-2 text-center text-gray-300">{r.year}</td>
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
        'url': `https://stats.tennismylife.org/recordsranking/agesendoftheseason/oldestattop/${top}`,
        'inLanguage': 'en-US',
        'isPartOf': { '@type': 'WebSite', 'name': 'TennisMyLife', 'url': 'https://stats.tennismylife.org' },
        'dateModified': new Date().toISOString(),
        'name': `Oldest Year-End ATP Top ${top} Players – All-Time`,
        'description': `Players who finished a season inside the ATP Top ${top} at the oldest age ever.`,
        'numberOfItems': Math.min(data.length, 10),
        'itemListElement': data.slice(0, 10).map((r, idx) => ({
          '@type': 'ListItem', 'position': idx + 1,
          'item': { '@type': 'SportsStatistic', 'name': r.name, ...(r.slug ? { 'url': `https://stats.tennismylife.org/players/${r.slug}/ranking` } : {}), 'additionalProperty': [
            { '@type': 'PropertyValue', 'name': 'Age', 'value': r.ageLabel },
            { '@type': 'PropertyValue', 'name': 'Year', 'value': r.year },
          ]},
        })),
      }) }} />
      <div className="flex items-center gap-4 mb-4">
        <label className="text-gray-200 font-medium">Top:</label>
      </div>
      <React.Suspense fallback={<div className="text-gray-400 py-2 text-center">Loading controls...</div>}>
        <RecordsTopControls initialTop={initialTop} hideLabel />
      </React.Suspense>

      {page === 1 && data.length > 0 && (
        <div className="mb-6 px-5 py-4 rounded-xl bg-gray-800/50 border border-white/10 text-gray-400 text-sm leading-relaxed max-w-3xl mx-auto">
          The oldest player to finish a season inside the ATP Top{' '}<span className="text-white font-medium">{top}</span> is{' '}
          <span className="text-indigo-300 font-medium">{data[0].name}</span>, who did so at the age of{' '}
          <span className="text-white font-medium">{data[0].ageLabel}</span> in{' '}
          <span className="text-white font-medium">{data[0].year}</span>.
          {data.length > 1 && (
            <> The second oldest is <span className="text-indigo-300 font-medium">{data[1].name}</span>{' '}
            (<span className="text-white font-medium">{data[1].ageLabel}</span>,{' '}
            <span className="text-white font-medium">{data[1].year}</span>).</>
          )}
        </div>
      )}

      {paginatedRows.length > 0 ? renderTable(paginatedRows, start) : (<div className="text-gray-400 py-4 text-center">No data available.</div>)}

      { totalPages > 1 && (
        <ServerPagination page={page} totalPages={totalPages} getHref={(p) => (sp as any)._numericInPath === '1' ? `?page=${p}` : `?top=${top}&page=${p}`} />
      )}
    </section>
  );
}
