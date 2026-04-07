import { prisma } from "@/lib/prisma";
import DropdownNavSelect from '@/components/DropdownNavSelect';
import ServerPagination from '@/components/ServerPagination';
import Flag from '@/components/Flag';
import Link from 'next/link';

interface YoungestItem {
  id: string;
  name: string;
  ioc?: string | null;
  ageDays: number;
  ageLabel: string; // "17y 3m 12d"
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
  const title = `Youngest Players Ever at ATP No. ${rank} – All-Time Records`;
  const description = `Who are the youngest players to reach ATP No. ${rank} in the rankings? Complete all-time list ordered by age.`;
  const canonical = `${SITE}/recordsranking/ages/youngestsatno/${rank}`;
  return {
    title,
    description,
    keywords: [`youngest ATP No. ${rank}`, 'ATP youngest No 1', 'youngest tennis player ranking', 'ATP records by age', 'tennis history'],
    alternates: { canonical },
    openGraph: { type: 'website', url: canonical, siteName: 'TennisMyLife', title, description, images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title, description, images: [OG_IMAGE] },
    robots: page > 1 ? { index: false, follow: true } : { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
    authors: [{ name: 'TennisMyLife' }],
  };
}

export default async function YoungestAtRank({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const rank = Number((sp.rank as string) ?? 1);
  const limit = Math.min(500, Math.max(1, Number((sp.limit as string) ?? 200)));

  // determine years and last per year
  const dateWhere: any = {};
  if (sp.fromYear) dateWhere.gte = new Date(Date.UTC(Number(sp.fromYear as string), 0, 1));
  if (sp.toYear) dateWhere.lt = new Date(Date.UTC(Number(sp.toYear as string) + 1, 0, 1));

  const allDates = await prisma.rankingDate.findMany({ where: Object.keys(dateWhere).length ? { date: dateWhere } : undefined, select: { date: true }, orderBy: { date: 'asc' } });
  const years = Array.from(new Set(allDates.map(d => d.date.getUTCFullYear())));
  if (years.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const lastPerYear = await Promise.all(years.map(async (year) => {
    const last = await prisma.rankingDate.findFirst({ where: { date: { gte: new Date(Date.UTC(year,0,1)), lt: new Date(Date.UTC(year+1,0,1)) } }, orderBy: { date: 'desc' }, select: { id: true, date: true } });
    return last ? { year, id: last.id, date: last.date } : null;
  }));
  const last = (lastPerYear.filter(Boolean) as { year: number; id: number; date: Date }[]);
  if (last.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const lastIds = last.map(x => x.id);
  const yearById = new Map<number, number>(last.map(x => [x.id, x.year]));

  const rowsData = await prisma.ranking.findMany({ where: { rank, rankingDateId: { in: lastIds } }, select: { playerId: true, player: { select: { atpname: true, ioc: true, birthdate: true, slug: true } }, rankingDateId: true, rankingDate: { select: { date: true } } } });

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
    if (!prev || ageDays < prev.ageDays || (ageDays === prev.ageDays && ref < prev.date)) {
      bestByPlayer.set(id, { name: r.player.atpname ?? '', ioc: r.player.ioc, year: recYear, date: ref, birth, ageDays, slug: r.player.slug ?? null });
    }
  }

  const totalCount = bestByPlayer.size;
  const data: YoungestItem[] = Array.from(bestByPlayer.entries()).map(([id, v]) => { const { y, m, d } = diffYMD(v.birth, v.date); return { id, name: v.name, ioc: v.ioc, ageDays: v.ageDays, ageLabel: `${y}y ${m}m ${d}d`, date: v.date.toISOString().slice(0,10), year: v.year as any, slug: v.slug }; }).sort((a,b)=> a.ageDays - b.ageDays).slice(0, limit);
  const under21 = data.filter(r => r.ageDays < 21 * 365).length;

  const perPage = 20;
  const page = Number((sp.page as string) ?? '1');
  const totalPages = Math.ceil(data.length / perPage);
  const start = (page - 1) * perPage;
  const paginatedRows = data.slice(start, start + perPage);

  const renderTable = (list: YoungestItem[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <caption className="py-2 text-sm font-semibold text-gray-400 uppercase tracking-wide">Record leaderboard</caption>
        <thead>
          <tr className="bg-black"><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Age at No. {rank}</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Date</th></tr>
        </thead>
        <tbody>
          {list.map((r, idx) => (
            <tr key={`${r.id}-${r.date}`} className="hover:bg-gray-800 border-b border-white/10"><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{startIndex + idx + 1}</td><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200"><div className="flex items-center justify-center gap-2">{r.ioc && <Flag ioc={r.ioc} className="w-4 h-3" />}{r.slug ? <Link href={`/players/${r.slug}/ranking`} className="hover:underline">{r.name}</Link> : <span>{r.name}</span>}</div></td><td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">{r.ageLabel}</td><td className="border border-white/10 px-4 py-2 text-center text-gray-300">{r.date}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const leader = data[0];
  const second  = data[1];
  const third   = data[2];

  return (
    <section className="mb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'ItemList',
        'url': `https://stats.tennismylife.org/recordsranking/ages/youngestsatno/${rank}`,
        'inLanguage': 'en-US',
        'isPartOf': { '@type': 'WebSite', 'name': 'TennisMyLife', 'url': 'https://stats.tennismylife.org' },
        'dateModified': new Date().toISOString(),
        'name': `Youngest Players at ATP No. ${rank} – All-Time`,
        'description': `Youngest ATP No. ${rank} holders by age on the date they first reached that ranking.`,
        'numberOfItems': Math.min(data.length, 10),
        'itemListElement': data.slice(0, 10).map((r, idx) => ({
          '@type': 'ListItem', 'position': idx + 1,
          'item': { '@type': 'SportsStatistic', 'name': r.name, ...(r.slug ? { 'url': `https://stats.tennismylife.org/players/${r.slug}/ranking` } : {}), 'additionalProperty': [
            { '@type': 'PropertyValue', 'name': 'Age', 'value': r.ageLabel },
            { '@type': 'PropertyValue', 'name': 'Date', 'value': r.date },
          ]},
        })),
      }) }} />
      <div className="flex items-center gap-4 mb-4">
        <label className="text-gray-200 font-medium">Rank:</label>
        <DropdownNavSelect name="rank" value={String(rank)} options={Array.from({ length: 10 }).map((_, i) => ({ value: String(i + 1), label: `No. ${i + 1}` }))} pathMode />
      </div>

      {/* Descriptive paragraph — page 1 only */}
      {page === 1 && leader && (
        <div className="mb-6 px-5 py-4 rounded-xl bg-gray-800/50 border border-white/10 text-gray-400 text-sm leading-relaxed max-w-3xl mx-auto">
          <p>
            The youngest player ever to reach ATP No.{' '}
            <span className="text-white font-medium">{rank}</span> is{' '}
            <span className="text-indigo-300 font-medium">{leader.name}</span>, who achieved this milestone at{' '}
            <span className="text-white font-medium">{leader.ageLabel}</span>{' '}
            on <span className="text-white font-medium">{leader.date}</span>.
            {second && (
              <>{' '}The second youngest is{' '}
                <span className="text-indigo-300 font-medium">{second.name}</span>{' '}
                ({second.ageLabel} on {second.date}).
              </>
            )}
            {third && (
              <>{' '}Third is{' '}
                <span className="text-indigo-300 font-medium">{third.name}</span>{' '}
                ({third.ageLabel}).
              </>
            )}
            {' '}A total of <span className="text-white font-medium">{totalCount}</span> players have ever reached No.{' '}
            <span className="text-white font-medium">{rank}</span>.
            {under21 > 0 && (
              <>{' '}<span className="text-white font-medium">{under21}</span> of them did so before turning 21.</>
            )}
          </p>
        </div>
      )}

      {paginatedRows.length > 0 ? renderTable(paginatedRows, start) : (<div className="text-gray-400 py-4 text-center">No data available.</div>)}

      {totalPages > 1 && (
        <ServerPagination page={page} totalPages={totalPages} getHref={(p) => `?rank=${rank}&page=${p}`} />
      )}
    </section>
  );
}
