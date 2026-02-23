import { prisma } from "@/lib/prisma";
import Flag from '@/components/Flag';
import DropdownNavSelect from '../../../../components/DropdownNavSelect';
import ServerPagination from '@/components/ServerPagination';
import type { Metadata } from 'next';

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const top = Number((Array.isArray(sp.top) ? sp.top[0] : sp.top) ?? (Array.isArray(sp.rank) ? sp.rank[0] : sp.rank) ?? 2);
  return { title: `Youngest Players at Top ${top} | ATP Ranking Records` };
}

interface YoungestTopItem {
  id: string;
  name: string;
  ioc?: string | null;
  ageDays: number;
  ageLabel: string; // "17y 2m 14d"
  date: string;     // "YYYY-MM-DD"
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
  const top = Number((sp.top as string) ?? (sp.rank as string) ?? 2);
  // keep at most 10 results client‑side as well
  const limit = Math.min(10, Math.max(1, Number((sp.limit as string) ?? 10)));

  const rowsData = await prisma.ranking.findMany({ where: { rank: { lte: top } }, select: { playerId: true, player: { select: { atpname: true, ioc: true, birthdate: true } }, rankingDate: { select: { date: true } } } });

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

  const data: YoungestTopItem[] = Array.from(bestByPlayer.entries()).map(([id, v]) => { const { y, m, d } = diffYMD(v.birth, v.date); return { id, name: v.name, ioc: v.ioc, ageDays: v.ageDays, ageLabel: `${y}y ${m}m ${d}d`, date: v.date.toISOString().slice(0,10) }; }).sort((a, b) => a.ageDays - b.ageDays).slice(0, limit);

  const perPage = 20;
  const page = Number((sp.page as string) ?? '1');
  const totalPages = Math.ceil(data.length / perPage);
  const start = (page - 1) * perPage;
  const paginatedRows = data.slice(start, start + perPage);

  const renderTable = (list: YoungestTopItem[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black"><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Top</th><th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Age at Top {top}</th><th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Date</th></tr>
        </thead>
        <tbody>
          {list.map((r, idx) => (
            <tr key={`${r.id}-${r.date}`} className="hover:bg-gray-800 border-b border-white/10"><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{startIndex + idx + 1}</td><td className="border border-white/10 px-4 py-2 text-lg text-gray-200"><div className="flex items-center gap-2">{r.ioc && <Flag ioc={r.ioc} className="w-4 h-3" />}<span>{r.name}</span></div></td><td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">{r.ageLabel}</td><td className="border border-white/10 px-4 py-2 text-gray-300">{r.date}</td></tr>
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

      { totalPages > 1 && (
        <ServerPagination page={page} totalPages={totalPages} getHref={(p) => `?top=${top}&page=${p}`} />
      )}
    </section>
  );
}
