import React from 'react';
import { prisma } from '@/lib/prisma';
import Flag from '@/components/Flag';
import DropdownNavSelect from '../../../../components/DropdownNavSelect';
import ServerPagination from '@/components/ServerPagination';
import { notFound } from 'next/navigation';

type Props = { searchParams?: Promise<Record<string,string | string[]>> };
import type { Metadata } from 'next';

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const top = Number((Array.isArray(sp.top) ? sp.top[0] : sp.top) ?? 2);
  const page = Number((sp.page as string) ?? '1');
  const SITE = 'https://stats.tennismylife.org';
  const OG_IMAGE = `${SITE}/og/site-preview.png`;
  const title = `Seasons at Year-End ATP Top ${top} – All-Time Leaders`;
  const description = `Which players finished the most seasons inside the ATP Top ${top} at year-end? Complete historical ranking with individual years.`;
  const canonical = `${SITE}/recordsranking/endoftheseason/attop/${top}`;
  return {
    title,
    description,
    keywords: [`year-end Top ${top}`, 'ATP year-end ranking', 'tennis ranking records', 'end of season ATP top', 'ATP history'],
    alternates: { canonical },
    openGraph: { type: 'website', url: canonical, siteName: 'TennisMyLife', title, description, images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title, description, images: [OG_IMAGE] },
    robots: page > 1 ? { index: false, follow: true } : { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
    authors: [{ name: 'TennisMyLife' }],
  };
}

export default async function RecordsTopX(props: Props) {
  const sp = await Promise.resolve(props.searchParams ?? {}) as Record<string, string | string[]>;
  const top = Number((sp.top as string) ?? 2);
  const perPage = 20;
  const page = Number((sp.page as string) ?? 1);
  if (!Number.isInteger(page) || page < 1) notFound();

  // port API logic server-side
  const fromYear = sp.fromYear ? Number(sp.fromYear as string) : null;
  const toYear = sp.toYear ? Number(sp.toYear as string) : null;
  const dateWhere: any = {};
  if (fromYear !== null) dateWhere.gte = new Date(Date.UTC(fromYear,0,1));
  if (toYear !== null)   dateWhere.lt  = new Date(Date.UTC(toYear+1,0,1));

  const allDates = await prisma.rankingDate.findMany({ where: Object.keys(dateWhere).length ? { date: dateWhere } : undefined, select: { date: true }, orderBy: { date: 'asc' } });
  const allYears = Array.from(new Set(allDates.map(d => d.date.getUTCFullYear())));
  if (allYears.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const lastDates = await Promise.all(allYears.map(async (year)=>{
    const last = await prisma.rankingDate.findFirst({ where: { date: { gte: new Date(Date.UTC(year,0,1)), lt: new Date(Date.UTC(year+1,0,1)) } }, orderBy: { date: 'desc' }, select: { id: true, date: true } });
    return last ? { year, id: last.id, date: last.date } : null;
  }));
  const validLast = (lastDates.filter(Boolean) as { year:number; id:number; date:Date }[]);
  if (validLast.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const lastDateIds = validLast.map(d=>d.id);

  const rows = await prisma.ranking.findMany({ where: { rank: { lte: top }, rankingDateId: { in: lastDateIds } }, select: { playerId: true, rank: true, player: { select: { atpname: true, ioc: true } }, rankingDate: { select: { date: true } } } });

  type Agg = { name: string; ioc: string | null; endYearTopCount: number; seasons: Set<number> };
  const agg = new Map<string, Agg>();
  for (const r of rows) {
    const id = String(r.playerId);
    const year = r.rankingDate.date.getUTCFullYear();
    let a = agg.get(id);
    if (!a) { if (!r.player) continue; a = { name: r.player.atpname ?? '', ioc: r.player.ioc ?? null, endYearTopCount: 0, seasons: new Set() }; agg.set(id, a); }
    if (!a.seasons.has(year)) { a.seasons.add(year); a.endYearTopCount += 1; }
  }

  const data = Array.from(agg.entries()).map(([id,v]) => ({ id, name: v.name, ioc: v.ioc, endYearTopCount: v.endYearTopCount, seasons: Array.from(v.seasons).sort((a,b)=>a-b) })).sort((a,b)=> b.endYearTopCount - a.endYearTopCount || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })).slice(0, 100);

  const totalPages = Math.ceil(data.length / perPage);
  if (data.length > 0 && page > totalPages) notFound();
  const start = (page-1)*perPage;
  const pageRows = data.slice(start, start + perPage);

  const renderTable = (list: typeof pageRows, startIndex=0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <caption className="py-2 text-sm font-semibold text-gray-400 uppercase tracking-wide">Record leaderboard</caption>
        <thead><tr className="bg-black"><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Top</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Seasons</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Years</th></tr></thead>
        <tbody>{list.map((p, idx)=>(<tr key={p.id} className="hover:bg-gray-800 border-b border-white/10"><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{startIndex+idx+1}</td><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200"><div className="flex items-center justify-center gap-2">{p.ioc && <Flag ioc={p.ioc} className="w-4 h-3" />}<span>{p.name}</span></div></td><td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">{p.endYearTopCount}</td><td className="border border-white/10 px-4 py-2 text-center text-gray-300">{p.seasons.join(', ')}</td></tr>))}</tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'ItemList',
        'url': `https://stats.tennismylife.org/recordsranking/endoftheseason/attop/${top}`,
        'inLanguage': 'en-US',
        'isPartOf': { '@type': 'WebSite', 'name': 'TennisMyLife', 'url': 'https://stats.tennismylife.org' },
        'dateModified': new Date().toISOString(),
        'name': `Year-End Top ${top} Finishes – All-Time`,
        'description': `Players with the most ATP year-end Top ${top} finishes in history.`,
        'numberOfItems': Math.min(data.length, 10),
        'itemListElement': data.slice(0, 10).map((r, idx) => ({
          '@type': 'ListItem', 'position': idx + 1,
          'item': { '@type': 'SportsStatistic', 'name': r.name, 'additionalProperty': [
            { '@type': 'PropertyValue', 'name': 'Year-End Top Finishes', 'value': r.endYearTopCount },
          ]},
        })),
      }) }} />
      <div className="flex items-center gap-4 mb-4">
        <label className="text-gray-200 font-medium">Top Range:</label>
        <DropdownNavSelect name="top" value={String(top)} options={[2,3,4,5,6,7,8,9,10,20,30,50,100].map(n=>({ value: String(n), label: `Top ${n}`}))} pathMode />
      </div>

      {/* Descriptive paragraph — page 1 only */}
      {page === 1 && data.length > 0 && (() => {
        const leader = data[0];
        const second = data[1];
        const third  = data[2];
        return (
          <div className="mb-6 px-5 py-4 rounded-xl bg-gray-800/50 border border-white/10 text-gray-400 text-sm leading-relaxed max-w-3xl mx-auto">
            <p>
              <span className="text-white font-medium">{data.length} player{data.length !== 1 ? 's have' : ' has'}</span>{' '}
              finished at least one season inside the ATP Top{' '}
              <span className="text-white font-medium">{top}</span> since{' '}
              <span className="text-white font-medium">1973</span>.{' '}
              <span className="text-indigo-300 font-medium">{leader.name}</span>{' '}
              leads with <span className="text-white font-medium">{leader.endYearTopCount} year-end finish{leader.endYearTopCount !== 1 ? 'es' : ''}</span>{' '}
              inside the Top {top}
              {leader.seasons && leader.seasons.length > 0 ? (
                <> ({leader.seasons.slice(0, 5).join(', ')}{leader.seasons.length > 5 ? '…' : ''})</>
              ) : null}
              {second ? (
                <>, ahead of{' '}
                  <span className="text-indigo-300 font-medium">{second.name}</span>{' '}
                  ({second.endYearTopCount})
                  {third ? (
                    <> and{' '}
                      <span className="text-indigo-300 font-medium">{third.name}</span>{' '}
                      ({third.endYearTopCount})
                    </>
                  ) : null}
                </>
              ) : null}.
            </p>
          </div>
        );
      })()}

      {pageRows.length>0? renderTable(pageRows, start) : (<div className="text-gray-400 py-4 text-center">No data available.</div>)}
      {totalPages > 1 && (
        <ServerPagination page={page} totalPages={totalPages} getHref={(p) => {
          if ((sp as any)._numericInPath === '1') {
            const parts = [fromYear !== null ? `fromYear=${fromYear}` : null, toYear !== null ? `toYear=${toYear}` : null, p > 1 ? `page=${p}` : null].filter(Boolean) as string[];
            return parts.length ? `?${parts.join('&')}` : '?';
          }
          return `?top=${top}${fromYear !== null ? `&fromYear=${fromYear}` : ''}${toYear !== null ? `&toYear=${toYear}` : ''}${p > 1 ? `&page=${p}` : ''}`;
        }} />
      )} 
    </section>
  );
}