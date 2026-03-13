import { prisma } from "@/lib/prisma";
import ServerPagination from '@/components/ServerPagination';
import Flag from '@/components/Flag';
import Link from 'next/link';
import DropdownNavSelect from '../../../../components/DropdownNavSelect';
import type { Metadata } from 'next';

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const top = Number((Array.isArray(sp.top) ? sp.top[0] : sp.top) ?? (Array.isArray(sp.rank) ? sp.rank[0] : sp.rank) ?? 100);
  return { title: `Oldest Players at Top ${top} | ATP Ranking Records` };
}

interface OldestTopItem {
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

export default async function OldestAtTopX({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const top = Number((sp.top as string) ?? (sp.rank as string) ?? 100);
  // compute oldest players among the specified Top‑X set
  const effectiveTop = top;
  const limit = Math.min(100, Math.max(1, Number((sp.limit as string) ?? 100)));
  let rowsData: any[];
  let fromMV = false;
  const clientAny = prisma as any;
  if (effectiveTop === 100 && clientAny.mv_ages_oldesttop_100) {
    rowsData = await clientAny.mv_ages_oldesttop_100.findMany({
      orderBy: { age_days: 'desc' },
      take: limit,
    });
    fromMV = true;
  } else if (effectiveTop === 50 && clientAny.mv_ages_oldesttop_50) {
    rowsData = await clientAny.mv_ages_oldesttop_50.findMany({
      orderBy: { age_days: 'desc' },
      take: limit,
    });
    fromMV = true;
  } else {
    // fallback: fetch ALL ranking entries for rank ≤ top (no take here — limit applied after per-player aggregation)
    rowsData = await prisma.ranking.findMany({
      where: { rank: { lte: top } },
      select: { playerId: true, player: { select: { atpname: true, ioc: true, birthdate: true } }, rankingDate: { select: { date: true } } },
    });
  }
  console.log('oldesttop page: fetched rows', rowsData.length, 'top', top, 'fromMV', fromMV);

  let data: OldestTopItem[];

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
      const date = r.rankingDate.date;
      if (date < birth) continue;
      const ageDays = Math.floor((date.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
      const prev = bestByPlayer.get(id);
      if (!prev || ageDays > prev.ageDays || (ageDays === prev.ageDays && date > prev.date)) {
        bestByPlayer.set(id, { name: r.player.atpname ?? '', ioc: r.player.ioc, date, birth, ageDays });
      }
    }
    data = Array.from(bestByPlayer.entries()).map(([id, v]) => { const { y,m,d } = diffYMD(v.birth, v.date); return { id, name: v.name, ioc: v.ioc, ageDays: v.ageDays, ageLabel: `${y}y ${m}m ${d}d`, date: v.date.toISOString().slice(0,10) }; }).sort((a,b) => b.ageDays - a.ageDays || a.name.localeCompare(b.name,'en',{sensitivity:'base'})).slice(0,limit);
  }

  const perPage = 20;
  const page = Number((sp.page as string) ?? '1');
  const totalPages = Math.ceil(data.length / perPage);
  const start = (page - 1) * perPage;
  const paginatedRows = data.slice(start, start + perPage);

  // Lookup slugs for rendered rows
  const slugMap = new Map<string, string | null>();
  const idsForSlug = paginatedRows.map(r => r.id).filter(Boolean);
  if (idsForSlug.length > 0) {
    const slugRows = await prisma.player.findMany({ where: { id: { in: idsForSlug } }, select: { id: true, slug: true } });
    slugRows.forEach(r => slugMap.set(r.id, r.slug));
  }

  const renderTable = (list: OldestTopItem[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
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

  return (
    <section className="mb-8">
      <div className="flex items-center gap-4 mb-4">
        <label className="text-gray-200 font-medium">Top:</label>
        <DropdownNavSelect name="top" value={String(top)} options={[1,2,3,4,5,6,7,8,9,10,20,30,50,100].map(n=>({ value: String(n), label: `Top ${n}`}))} />
      </div>


      {paginatedRows.length > 0 ? renderTable(paginatedRows, start) : (<div className="text-gray-400 py-4 text-center">No data available.</div>)}

      {totalPages > 1 && (
        <ServerPagination page={page} totalPages={totalPages} getHref={(p) => `?top=${top}&page=${p}`} />
      )}
    </section>
  );
}
