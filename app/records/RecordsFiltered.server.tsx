import React from 'react';
import { metadataBase } from '../../lib/site';
import { isRecordsSsrPrefetchEnabled } from '../../lib/recordsSsrPrefetch';

interface Props {
  record: string | null;
  sub?: string | null;
  filters?: Record<string, string | string[] | undefined>;
  canonicalUrl?: string;
}

async function fetchRecord(record: string | null, sub?: string | null, filters?: Record<string, string | string[] | undefined>) {
  if (!record) return [] as any[];
  if (!isRecordsSsrPrefetchEnabled()) return [] as any[];
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters || {})) {
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach(x => params.append(k, x));
    else params.append(k, String(v));
  }
  const path = `/api/records/${encodeURIComponent(record)}${sub ? '/' + encodeURIComponent(sub) : ''}` + (params.toString() ? `?${params.toString()}` : '');
  const url = new URL(path, metadataBase).toString();
  try {
    const res = await fetch(url);
    if (!res.ok) return [] as any[];
    const json = await res.json();
    return Array.isArray(json) ? json : (json && typeof json === 'object' ? (json.rows || json.top || json.topWinners || json.topPlayed || []) : []);
  } catch (e) {
    return [] as any[];
  }
}

export default async function RecordsFilteredServer({ record, sub, filters = {}, canonicalUrl }: Props) {
  const data = await fetchRecord(record, sub, filters);

  return (
    <section className="bg-gray-800/40 rounded-2xl p-4 shadow-lg">
      {data && data.length > 0 ? (
        <table className="w-full table-auto text-left text-sm">
          <thead>
            <tr className="text-gray-300">
              {Object.keys(data[0]).map((k) => (
                <th key={k} className="px-2 py-1 font-medium">{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row: any, idx: number) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-900/30' : ''}>
                {Object.values(row).map((v, j) => (
                  <td className="px-2 py-1 text-gray-200" key={j}>{String(v ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-center text-gray-400">No data available</div>
      )}
    </section>
  );
}
