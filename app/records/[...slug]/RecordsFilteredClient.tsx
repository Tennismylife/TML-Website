"use client";

import React, { useEffect, useState } from 'react';
import { generateRecordDescription } from '../../../lib/generateRecordDescription';
import { keyFromParamLabel } from '@/lib/levels';

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
    // Compute description so document.title always matches the H1 above the table
    const toArray = (v?: string | string[]) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]));
    const selectedSurfaces = new Set(toArray(filters.surface ?? filters['surface[]']));
    const selectedLevels = new Set(toArray(filters.level ?? filters['level[]']));
    const selectedRounds = typeof filters.round === 'string' ? String(filters.round) : '';
    const selectedBestOf = filters.bestOf ? Number(filters.bestOf as string) : null;

    const kebabToKey = (s: string | undefined) => {
      if (!s) return s;
      if (s.includes('-')) return s.split('-').map((part, idx) => idx === 0 ? part : (part.charAt(0).toUpperCase() + part.slice(1))).join('');
      const suffixMap: Record<string, string> = { winners: 'Winners', maindraw: 'MainDraw' };
      const lower = s.toLowerCase();
      for (const [suffix, camel] of Object.entries(suffixMap)) {
        if (lower.endsWith(suffix)) {
          const prefix = s.slice(0, s.length - suffix.length);
          return prefix + camel;
        }
      }
      return s;
    };
    const activeSubTabsDefault: Record<string,string> = {
      ages: 'oldest',
      timespan: 'entries',
      roundsonentries: 'titles',
      same: 'wins',
      seasons: 'wins',
      atage: 'wins',
      ageofnth: 'wins',
      neededto: 'titles',
      counterseasons: 'round',
      streak: 'wins',
      h2h: 'count',
    };

    const effectiveSub = sub ?? (typeof filters.subtab === 'string' ? kebabToKey(String(filters.subtab)) : undefined);

    const description = generateRecordDescription(record, { ...activeSubTabsDefault, [record || '']: effectiveSub || activeSubTabsDefault[record || ''] }, selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf);

    if (description) {
      document.title = `${description} | Tennis Records`;
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.debug('[RecordsFilteredClient] set title', document.title);
    } else {
      // Skip setting a placeholder title (e.g. "Filters applied") to avoid briefly overwriting a correct title
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.debug('[RecordsFilteredClient] skipping title update (no description)');
    }

    // meta robots noindex,follow
    const metaRobots = document.querySelector('meta[name="robots"]') || document.createElement('meta');
    metaRobots.setAttribute('name', 'robots');
    metaRobots.setAttribute('content', 'noindex, follow');
    if (!document.querySelector('meta[name="robots"]')) document.head.appendChild(metaRobots);

    // canonical
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
          const normalizeForApi = (key: string, val: string) => {
            if (key === 'surface') return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
            if (key === 'level') {
              // Accept either a param label (Grand-Slam) or a letter (G) and return the letter
              const k = keyFromParamLabel(val);
              return k || String(val).toUpperCase();
            }
            if (key === 'round') return val.toUpperCase();
            return val;
          };

          if (Array.isArray(v)) v.forEach(x => params.append(k, normalizeForApi(k, String(x))));
          else params.append(k, normalizeForApi(k, String(v)));
        }
        const effectiveSub = sub ?? (typeof filters.subtab === 'string' ? String(filters.subtab) : undefined);
        const path = `/api/records/${encodeURIComponent(record ?? '')}${effectiveSub ? '/' + encodeURIComponent(effectiveSub) : ''}` + (params.toString() ? `?${params.toString()}` : '');
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.debug('[RecordsFilteredClient] fetching', path);
        const res = await fetch(path);
        if (!res.ok) throw new Error(`Fetch error ${res.status}`);
        const json = await res.json();
        setData(Array.isArray(json) ? json : []);
      } catch (err: any) {
        setError(err?.message || 'Error fetching data');
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    doFetch();
  }, [record, sub, JSON.stringify(filters), canonicalUrl]);

  if (loading) return <div className="text-gray-300">Loading filtered results…</div>;
  if (error) return <div className="text-red-400">{error}</div>;

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
