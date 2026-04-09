import { prisma } from "@/lib/prisma";
import Flag from '@/components/Flag';
import Link from 'next/link';
import DropdownNavSelect from '../../../../components/DropdownNavSelect';
import ServerPagination from '@/components/ServerPagination';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const top = Number((Array.isArray(sp.top) ? sp.top[0] : sp.top) ?? (Array.isArray(sp.rank) ? sp.rank[0] : sp.rank) ?? 100);
  const page = Number((sp.page as string) ?? '1');
  const SITE = 'https://stats.tennismylife.org';
  const OG_IMAGE = `${SITE}/og/site-preview.png`;
  const title = `Youngest Players Ever in ATP Top ${top} – All-Time Records`;
  const description = `Who are the youngest players to enter the ATP Top ${top}? All-time historical list ordered by age.`;
  const canonical = `${SITE}/recordsranking/ages/youngestattop/${top}`;
  return {
    title,
    description,
    keywords: [`youngest ATP Top ${top}`, 'youngest tennis player ranking', 'ATP records by age', 'ATP history', 'tennis records'],
    alternates: { canonical },
    openGraph: { type: 'website', url: canonical, siteName: 'TennisMyLife', title, description, images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title, description, images: [OG_IMAGE] },
    robots: page > 1 ? { index: false, follow: true } : { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
    authors: [{ name: 'TennisMyLife' }],
  };
}

interface YoungestTopItem {
  id: string;
  name: string;
  ioc?: string | null;
  ageDays: number;
  ageLabel: string; // "17y 2m 14d"
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

export default async function YoungestAtTopX({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const top = Number((sp.top as string) ?? (sp.rank as string) ?? 100);
  // compute youngest players among the specified Top‑X set
  const effectiveTop = top;
  // cap returned rows to 100 (default) or user-specified limit
  const limit = 100;

  // fetch from materialized view via Prisma models when available
  let rowsData: any[];
  let fromMV = false;
  const clientAny = prisma as any;
  if (effectiveTop === 100 && clientAny.mv_ages_youngesttop_100) {
    rowsData = await clientAny.mv_ages_youngesttop_100.findMany({
      orderBy: { age_days: 'asc' },
      take: limit,
    });
    fromMV = true;
  } else if (effectiveTop === 50 && clientAny.mv_ages_youngesttop_50) {
    rowsData = await clientAny.mv_ages_youngesttop_50.findMany({
      orderBy: { age_days: 'asc' },
      take: limit,
    });
    fromMV = true;
  } else {
    // fallback: fetch ALL ranking entries for rank ≤ top (no take here — limit applied after per-player aggregation)
    rowsData = await prisma.ranking.findMany({
      where: { rank: { lte: top } },
      select: { playerId: true, player: { select: { atpname: true, ioc: true, birthdate: true } }, rankingDate: { select: { date: true } } }
    });
  }

  let data: YoungestTopItem[];

  if (fromMV) {
    // MV rows are flat: { player_id, rank, atpname, ioc, birthdate, date, age_days }
    data = rowsData.map((r: any) => {
      const birth = r.birthdate instanceof Date ? r.birthdate : new Date(r.birthdate);
      const ref   = r.date     instanceof Date ? r.date     : new Date(r.date);
      const { y, m, d } = diffYMD(birth, ref);
      return {
        id:       String(r.player_id),
        name:     r.atpname ?? '',
        ioc:      r.ioc ?? null,
        ageDays:  Number(r.age_days),
        ageLabel: `${y}y ${m}m ${d}d`,
        date:     ref.toISOString().slice(0, 10),
      };
    }).slice(0, limit);
  } else {
    const bestByPlayer = new Map<string, { name: string; ioc: string | null; date: Date; birth: Date; ageDays: number }>();
    for (const r of rowsData) {
      if (!r.player || r.playerId == null) continue;
      const id = String(r.playerId);
      const birth = r.player.birthdate;
      if (!birth) continue;
      const ref = r.rankingDate.date;
      if (ref < birth) continue;
      const ageDays = Math.floor((ref.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
      const prev = bestByPlayer.get(id);
      if (!prev || ageDays < prev.ageDays || (ageDays === prev.ageDays && ref < prev.date)) {
        bestByPlayer.set(id, { name: r.player.atpname ?? '', ioc: r.player.ioc, date: ref, birth, ageDays });
      }
    }
    data = Array.from(bestByPlayer.entries()).map(([id, v]) => { const { y, m, d } = diffYMD(v.birth, v.date); return { id, name: v.name, ioc: v.ioc, ageDays: v.ageDays, ageLabel: `${y}y ${m}m ${d}d`, date: v.date.toISOString().slice(0,10) }; }).sort((a, b) => a.ageDays - b.ageDays).slice(0, limit);
  }

  const under21Top = data.filter(r => r.ageDays < 21 * 365).length;

  const perPage = 20;
  const page = Number((sp.page as string) ?? '1');
  if (!Number.isInteger(page) || page < 1) notFound();
  const totalPages = Math.ceil(data.length / perPage);
  if (data.length > 0 && page > totalPages) notFound();
  const start = (page - 1) * perPage;
  const paginatedRows = data.slice(start, start + perPage);

  // Lookup slugs for rendered rows
  const slugMap = new Map<string, string | null>();
  const idsForSlug = paginatedRows.map(r => r.id).filter(Boolean);
  if (idsForSlug.length > 0) {
    const slugRows = await prisma.player.findMany({ where: { id: { in: idsForSlug } }, select: { id: true, slug: true } });
    slugRows.forEach(r => slugMap.set(r.id, r.slug));
  }

  const renderTable = (list: YoungestTopItem[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <caption className="py-2 text-sm font-semibold text-gray-400 uppercase tracking-wide">Record leaderboard</caption>
        <thead>
          <tr className="bg-black"><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Top</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Age at Top {top}</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Date</th></tr>
        </thead>
        <tbody>
          {list.map((r, idx) => (
            <tr key={`${r.id}-${r.date}`} className="hover:bg-gray-800 border-b border-white/10"><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{startIndex + idx + 1}</td><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200"><div className="flex items-center justify-center gap-2">{r.ioc && <Flag ioc={r.ioc} className="w-4 h-3" />}{(r.slug ?? slugMap.get(r.id)) ? <Link href={`/players/${r.slug ?? slugMap.get(r.id)}/ranking`} className="hover:underline">{r.name}</Link> : <span>{r.name}</span>}</div></td><td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">{r.ageLabel}</td><td className="border border-white/10 px-4 py-2 text-center text-gray-300">{r.date}</td></tr>
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
        'url': `https://stats.tennismylife.org/recordsranking/ages/youngestattop/${top}`,
        'inLanguage': 'en-US',
        'isPartOf': { '@type': 'WebSite', 'name': 'TennisMyLife', 'url': 'https://stats.tennismylife.org' },
        'dateModified': new Date().toISOString(),
        'name': `Youngest Players in ATP Top ${top} – All-Time`,
        'description': `Youngest ATP Top ${top} entries by age on first appearance in the Top ${top}.`,
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
        <label className="text-gray-200 font-medium">Top:</label>
        <DropdownNavSelect name="top" value={String(top)} options={[2,3,4,5,6,7,8,9,10,20,30,50,100].map(n=>({ value: String(n), label: `Top ${n}`}))} pathMode />
      </div>

      {/* Descriptive paragraph — page 1 only */}
      {page === 1 && leader && (
        <div className="mb-6 px-5 py-4 rounded-xl bg-gray-800/50 border border-white/10 text-gray-400 text-sm leading-relaxed max-w-3xl mx-auto">
          <p>
            The youngest player ever to enter the ATP Top{' '}
            <span className="text-white font-medium">{top}</span> is{' '}
            <span className="text-indigo-300 font-medium">{leader.name}</span>, who first appeared at{' '}
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
            {under21Top > 0 && (
              <>{' '}<span className="text-white font-medium">{under21Top}</span> players in this list entered the Top{' '}
              <span className="text-white font-medium">{top}</span> before their 21st birthday.</>
            )}
          </p>
        </div>
      )}

      {paginatedRows.length > 0 ? renderTable(paginatedRows, start) : (<div className="text-gray-400 py-4 text-center">No data available.</div>)}

      { totalPages > 1 && (
        <ServerPagination page={page} totalPages={totalPages} getHref={(p) => (sp as any)._numericInPath === '1' ? `?page=${p}` : `?top=${top}&page=${p}`} />
      )}
    </section>
  );
}
