import { getOldestTop } from '@/lib/recordsranking';
import ServerPagination from '@/components/ServerPagination';
import Flag from '@/components/Flag';
import DropdownNavSelect from '../../../../components/DropdownNavSelect';
import type { Metadata } from 'next';

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const top = Number((Array.isArray(sp.top) ? sp.top[0] : sp.top) ?? (Array.isArray(sp.rank) ? sp.rank[0] : sp.rank) ?? 2);
  return { title: `Oldest Players at Top ${top} | ATP Ranking Records` };
}

interface OldestTopItem {
  id: string;
  name: string;
  ioc?: string | null;
  ageDays: number;
  ageLabel: string; // "37y 2m 14d"
  date: string;     // "YYYY-MM-DD"
}

export default async function OldestAtTopX({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const top = Number((sp.top as string) ?? (sp.rank as string) ?? 2);
  // cap results to 100 as well
  const limit = Math.min(100, Math.max(1, Number((sp.limit as string) ?? 100)));

  const data: OldestTopItem[] = await getOldestTop(top, limit);

  const perPage = 20;
  const page = Number((sp.page as string) ?? '1');
  const totalPages = Math.ceil(data.length / perPage);
  const start = (page - 1) * perPage;
  const paginatedRows = data.slice(start, start + perPage);

  const renderTable = (list: OldestTopItem[], startIndex = 0) => (
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

      {totalPages > 1 && (
        <ServerPagination page={page} totalPages={totalPages} getHref={(p) => `?top=${top}&page=${p}`} />
      )}
    </section>
  );
}
