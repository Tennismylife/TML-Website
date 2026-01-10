import React from 'react';
import { getFlagFromIOC } from '@/lib/utils';

export default async function MaxDifferenceNo1No2({ searchParams }: { searchParams?: Record<string,string | string[]> }) {
  const includeAll = (searchParams?.includeAll as string) === '1';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/recordsranking/diffpoints/overall`, { cache: 'no-store' });
  const data = await res.json();
  const rows = Array.isArray(data) ? data : [];
  const toShow = includeAll ? rows : rows.slice(0, 10);

  const renderTable = (list: any[]) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black"><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th><th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">No. 1 Player</th><th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">No. 2 Player</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Points No. 1</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Points No. 2</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Points Diff.</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Date</th></tr>
        </thead>
        <tbody>
          {list.map((r) => (<tr key={`${r.rank}-${r.date}`} className="hover:bg-gray-800 border-b border-white/10"><td className="border border-white/10 px-4 py-2 text-center text-gray-200 font-semibold">{r.rank}</td><td className="border border-white/10 px-4 py-2 text-lg text-gray-200"><div className="flex items-center gap-2">{r.country && <span className="text-base" aria-hidden="true">{getFlagFromIOC(r.country)}</span>}<span>{r.name}</span></div></td><td className="border border-white/10 px-4 py-2 text-lg text-gray-300"><div className="flex items-center gap-2">{r.country_no2 && <span className="text-base" aria-hidden="true">{getFlagFromIOC(r.country_no2)}</span>}<span>{r.no2}</span></div></td><td className="border border-white/10 px-4 py-2 text-center text-indigo-300">{r.points_no1.toLocaleString()}</td><td className="border border-white/10 px-4 py-2 text-center text-gray-400">{r.points_no2.toLocaleString()}</td><td className="border border-white/10 px-4 py-2 text-center text-green-400 font-semibold">{r.points_diff.toLocaleString()}</td><td className="border border-white/10 px-4 py-2 text-center text-gray-300">{r.date}</td></tr>))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <h2 className="text-xl text-gray-100 font-semibold mb-3">Maximum Difference Between No. 1 and No. 2</h2>
      <div className="mb-4 flex justify-end">
        {includeAll ? null : <a href={`?includeAll=1`} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500">View All</a>}
      </div>

      {rows.length === 0 ? <div className="text-gray-400 py-4 text-center">No data available.</div> : renderTable(toShow)}
    </section>
  );
}