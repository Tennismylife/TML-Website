import React from 'react';
import Flag from '@/components/Flag';

export default async function YearEndDifferenceNo1No2({ searchParams }: { searchParams?: Promise<Record<string,string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/recordsranking/diffpoints/endoftheseason`, { cache: 'no-store' });
  const data = await res.json();
  const rows = Array.isArray(data) ? data : [];
  const toShow = rows.slice(0, 10);

  const renderTable = (list: any[]) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead><tr className="bg-black"><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th><th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">No. 1 Player</th><th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">No. 2 Player</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Points No. 1</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Points No. 2</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Points Diff.</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Year</th></tr></thead>
        <tbody>{list.map((r)=> (<tr key={r.year} className="hover:bg-gray-800 border-b border-white/10"><td className="border border-white/10 px-4 py-2 text-center text-gray-200 font-semibold">{r.rank}</td><td className="border border-white/10 px-4 py-2 text-lg text-gray-200"><div className="flex items-center gap-2">{r.country && <Flag ioc={r.country} className="w-4 h-3" />}<span>{r.name}</span></div></td><td className="border border-white/10 px-4 py-2 text-lg text-gray-300"><div className="flex items-center gap-2">{r.country_no2 && <Flag ioc={r.country_no2} className="w-4 h-3" />}<span>{r.no2}</span></div></td><td className="border border-white/10 px-4 py-2 text-center text-indigo-300">{r.points_no1.toLocaleString()}</td><td className="border border-white/10 px-4 py-2 text-center text-gray-400">{r.points_no2.toLocaleString()}</td><td className="border border-white/10 px-4 py-2 text-center text-green-400 font-semibold">{r.points_diff.toLocaleString()}</td><td className="border border-white/10 px-4 py-2 text-center text-gray-200">{r.year}</td></tr>))}</tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      {rows.length === 0 ? <div className="text-gray-400 py-4 text-center">No data available.</div> : renderTable(toShow)}
    </section>
  );
}