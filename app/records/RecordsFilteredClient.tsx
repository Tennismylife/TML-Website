"use client";

import React, { useEffect, useState } from 'react';
import { RECORDS_NOINDEX_ENABLED } from '@/lib/seo/records-policy';

interface Props {
  record: string | null;
  sub?: string | null;
  filters?: Record<string, string | string[] | undefined>;
  canonicalUrl?: string;
}

export default function RecordsFilteredClient({ record, sub, filters = {}, canonicalUrl }: Props) {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Update document title
    try {
      const baseTitle = record ? record.toUpperCase() : '';
      document.title = baseTitle ? `${baseTitle} — Filters applied` : 'Filters applied';
    } catch (err) {}

    // set meta robots noindex,follow (only when the master switch is on)
    if (RECORDS_NOINDEX_ENABLED) {
      const metaRobots = document.querySelector('meta[name="robots"]') || document.createElement('meta');
      metaRobots.setAttribute('name', 'robots');
      metaRobots.setAttribute('content', 'noindex, nofollow');
      if (!document.querySelector('meta[name="robots"]')) document.head.appendChild(metaRobots);
    }

    // set canonical link to main page
    if (canonicalUrl) {
      let existing = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!existing) {
        existing = document.createElement('link');
        existing.setAttribute('rel', 'canonical');
        document.head.appendChild(existing);
      }
      existing.setAttribute('href', canonicalUrl);
    }

    async function doFetch() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(filters || {})) {
          if (v == null) continue;
          if (Array.isArray(v)) v.forEach(x => params.append(k, x));
          else params.append(k, String(v));
        }
        const path = `/api/records/${encodeURIComponent(record ?? '')}${sub ? '/' + encodeURIComponent(sub) : ''}` + (params.toString() ? `?${params.toString()}` : '');
        const res = await fetch(path);
        if (!res.ok) throw new Error(`Fetch error ${res.status}`);
        const json = await res.json();
        if (Array.isArray(json)) {
          setData(json);
        } else if (json && typeof json === 'object') {
          // accept common shapes like { topWinners, topPlayed, rows, ... }
          const keys = ['topWinners', 'topPlayed', 'top', 'topTitles', 'topEntries', 'topRoundOnEntries', 'rows'];
          let found: any[] | null = null;
          for (const k of keys) {
            if (Array.isArray((json as any)[k])) { found = (json as any)[k]; break; }
          }
          if (!found) {
            const arrProps = Object.values(json).filter((v) => Array.isArray(v));
            if (arrProps.length) found = arrProps[0] as any[];
          }
          setData(found || []);
        } else {
          setData([]);
        setError('Failed to load records.');
        }
      } catch (err: any) {
        setError(err?.message || 'Error fetching data');
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    doFetch();

    // cleanup: optionally remove injected meta/canonical when unmounting? keep as is
  }, [record, sub, JSON.stringify(filters), canonicalUrl]);

  const hasRows = Array.isArray(data) && data.length > 0;

  return (
    <section className="bg-gray-800/40 rounded-2xl p-4 shadow-lg">
      {error ? (
        <div className="text-center py-8 text-gray-300">{error}</div>
      ) : loading && !hasRows ? (
        <div className="text-center py-8 text-gray-300">Loading...</div>
      ) : hasRows ? (
        <>
          <table className="w-full table-auto text-center text-sm">
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
        </>
      ) : (
        <div className="text-center py-8 text-gray-300">No data available.</div>
      )}
    </section>
  );
}
