import React from 'react';
import Link from 'next/link';
import { getFlagFromIOC } from '@/lib/utils';

import { metadataBase } from '@/lib/site';
import { getTournamentName } from '@/lib/recordMetadata';

type Props = {
  id: string;
  section?: string;
  which?: 'youngest' | 'oldest';
  title?: string;
};

async function fetchAgesApi(id: string, segment: string, full = true) {
  const q = full ? '?full=true' : '';
  const base = (process.env.SITE_URL && process.env.SITE_URL.length)
    ? new URL(process.env.SITE_URL)
    : (process.env.NODE_ENV === 'development' ? new URL('http://localhost:3000') : metadataBase);
  const url = new URL(`/api/tournaments/${id}/records/ages/${segment}${q}`, base).toString();
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch ${segment} (${res.status}) from ${url}`);
    return res.json();
  } catch (err: any) {
    throw new Error(`fetch failed for ${url}: ${String(err?.message ?? err)}`);
  }
}

export default async function AgesFull({ id, section = 'titles', which, title }: Props) {
  if (!id) {
    return (
      <div className="text-white">
        <h3 className="text-2xl font-semibold">Ages</h3>
        <p className="text-gray-300">No tournament id provided.</p>
      </div>
    );
  }

  const seg = section ?? 'titles';

  try {
    if (seg === 'main') {
      const data = await fetchAgesApi(id, 'main', true);
      const topYoungest = data.topYoungest ?? data.youngestPlayers ?? [];
      const topOldest = data.topOldest ?? data.oldestPlayers ?? [];

      const formatAge = (age: number) => {
        const a = Number(age) || 0;
        const years = Math.floor(a);
        const days = Math.round((a - years) * 365.25);
        return `${years}y ${days}d`;
      };

      const renderTable = (rows: any[], showYear = true) => (
        <div className="overflow-x-auto">
          <table className="w-full text-lg md:text-xl border-collapse table-fixed text-center">
            <colgroup>
              <col style={{ width: '60%' }} />
              <col style={{ width: '20%' }} />
              {showYear && <col style={{ width: '20%' }} />}
            </colgroup>
            <thead className="bg-gray-800">
              <tr>
                <th className="text-center py-2 text-gray-300">Player</th>
                <th className="text-center py-2 text-gray-300">Age</th>
                {showYear && <th className="text-center py-2 text-gray-300">Year</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.id}-${r.year}-${String(r.age || '')}`} className="border-b border-gray-700">
                  <td className="py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-base">{getFlagFromIOC(r.ioc) || ''}</span>
                      <Link href={`/players/${encodeURIComponent(String(r.id))}`} className="text-blue-400 hover:underline text-lg md:text-xl">{r.name}</Link>
                    </div>
                  </td>
                  <td className="py-2 text-center text-lg md:text-xl text-white">{formatAge(r.age)}</td>
                  {showYear && <td className="py-2 text-center text-lg md:text-xl text-white"><Link href={`/tournaments/${r.tourney_id ?? id}/${r.year}`} className="text-blue-400 hover:underline">{r.year}</Link></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

      // if a specific which is requested, render only that table
      if ((arguments as any)[0] && (arguments as any)[0].which === 'youngest') {
        const tournamentName = await getTournamentName(id);
        return (
          <div className="text-white">
            <div className="mb-3 text-center">
              <h3 className="text-2xl font-semibold">{`Youngest Players in Main Draw at ${tournamentName}`}</h3>
            </div>
            <div className="p-1 border border-gray-700 bg-gray-800 rounded">
              <div className="p-3">{renderTable(topYoungest)}</div>
            </div>
          </div>
        );
      }

      if ((arguments as any)[0] && (arguments as any)[0].which === 'oldest') {
        const tournamentName = await getTournamentName(id);
        return (
          <div className="text-white">
            <div className="mb-3 text-center">
              <h3 className="text-2xl font-semibold">{`Oldest Players in Main Draw at ${tournamentName}`}</h3>
            </div>
            <div className="p-1 border border-gray-700 bg-gray-800 rounded">
              <div className="p-3">{renderTable(topOldest)}</div>
            </div>
          </div>
        );
      }

      const tournamentName = await getTournamentName(id);
      return (
        <div className="text-white">
          <div className="mb-3 text-center">
            <h3 className="text-2xl font-semibold">{`Youngest & Oldest Players in Main Draw at ${tournamentName}`}</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-1 border border-gray-700 bg-gray-800 rounded">
              <div className="p-3">
                <h4 className="text-white font-medium mb-2">Youngest Players</h4>
                {renderTable(topYoungest)}
              </div>
            </div>

            <div className="p-1 border border-gray-700 bg-gray-800 rounded">
              <div className="p-3">
                <h4 className="text-white font-medium mb-2">Oldest Players</h4>
                {renderTable(topOldest)}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // For titles/youngest/oldest sections, render winners lists
    const safeSection = seg;
    if (safeSection === 'titles') {
      const data = await fetchAgesApi(id, 'titles', true);
      const topYoungest = data.youngestWinners ?? data.topYoungestWinners ?? [];
      const topOldest = data.oldestWinners ?? data.topOldestWinners ?? [];

      const formatAge = (age: number) => {
        const a = Number(age) || 0;
        const years = Math.floor(a);
        const days = Math.round((a - years) * 365.25);
        return `${years}y ${days}d`;
      };

      const renderTable = (rows: any[]) => (
        <div className="overflow-x-auto">
          <table className="w-full text-lg md:text-xl border-collapse table-fixed text-center">
            <colgroup>
              <col style={{ width: '70%' }} />
              <col style={{ width: '30%' }} />
            </colgroup>
            <thead className="bg-gray-800">
              <tr>
                <th className="text-center py-2 text-gray-300">Player</th>
                <th className="text-center py-2 text-gray-300">Age</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.id}-${r.year}-${String(r.age || '')}`} className="border-b border-gray-700">
                  <td className="py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-base">{getFlagFromIOC(r.ioc) || ''}</span>
                      <Link href={`/players/${encodeURIComponent(String(r.id))}`} className="text-blue-400 hover:underline text-lg md:text-xl">{r.name}</Link>
                    </div>
                  </td>
                  <td className="py-2 text-center text-lg md:text-xl text-white">{formatAge(r.age)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

      const tournamentName = await getTournamentName(id);
      if (which === 'youngest') {
        return (
          <div className="text-white">
            <div className="mb-3 text-center">
              <h3 className="text-2xl font-semibold">{`Youngest Title Winners at ${tournamentName}`}</h3>
            </div>
            <div className="p-1 border border-gray-700 bg-gray-800 rounded">
              <div className="p-3">{renderTable(topYoungest)}</div>
            </div>
          </div>
        );
      }

      if (which === 'oldest') {
        return (
          <div className="text-white">
            <div className="mb-3 text-center">
              <h3 className="text-2xl font-semibold">{`Oldest Title Winners at ${tournamentName}`}</h3>
            </div>
            <div className="p-1 border border-gray-700 bg-gray-800 rounded">
              <div className="p-3">{renderTable(topOldest)}</div>
            </div>
          </div>
        );
      }

      return (
        <div className="text-white">
          <div className="mb-3 text-center">
            <h3 className="text-2xl font-semibold">{`Youngest & Oldest Winners at ${tournamentName}`}</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-1 border border-gray-700 bg-gray-800 rounded">
              <div className="p-3">
                <h4 className="text-white font-medium mb-2">Youngest Winners</h4>
                {renderTable(topYoungest)}
              </div>
            </div>

            <div className="p-1 border border-gray-700 bg-gray-800 rounded">
              <div className="p-3">
                <h4 className="text-white font-medium mb-2">Oldest Winners</h4>
                {renderTable(topOldest)}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Support for youngest/oldest per-round sections
    if (safeSection === 'youngestrounds' || safeSection === 'oldestrounds') {
      const data = await fetchAgesApi(id, safeSection, true);
      const listKey = safeSection === 'youngestrounds' ? 'allYoungestItems' : 'allOldestItems';
      const items = data[listKey] ?? [];

      const formatAge = (age: number) => {
        const a = Number(age) || 0;
        const years = Math.floor(a);
        const days = Math.round((a - years) * 365.25);
        return `${years}y ${days}d`;
      };

      const renderTable = (rows: any[]) => (
        <div className="overflow-x-auto">
          <table className="w-full text-lg md:text-xl border-collapse table-fixed text-center">
            <colgroup>
              <col style={{ width: '60%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead className="bg-gray-800">
              <tr>
                <th className="text-center py-2 text-gray-300">Player</th>
                <th className="text-center py-2 text-gray-300">Age</th>
                <th className="text-center py-2 text-gray-300">Year</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.id}-${r.year}-${String(r.age || '')}`} className="border-b border-gray-700">
                  <td className="py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-base">{getFlagFromIOC(r.ioc) || ''}</span>
                      <Link href={`/players/${encodeURIComponent(String(r.id))}`} className="text-blue-400 hover:underline text-lg md:text-xl">{r.name}</Link>
                    </div>
                  </td>
                  <td className="py-2 text-center text-lg md:text-xl text-white">{formatAge(r.age)}</td>
                  <td className="py-2 text-center text-lg md:text-xl text-white"><Link href={`/tournaments/${r.tourney_id ?? id}/${r.year}`} className="text-blue-400 hover:underline">{r.year}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

      // if title provided, render only that round's fullList
      if (title) {
        const found = items.find((it: any) => String(it.title) === String(title) || String(it.title) === decodeURIComponent(String(title)));
        const rows = found ? (found.fullList ?? found.list ?? []) : [];
        const tournamentName = await getTournamentName(id);
        const side = safeSection === 'youngestrounds' ? 'Youngest Players' : 'Oldest Players';
        return (
          <div className="text-white">
            <div className="mb-3 text-center">
              <h3 className="text-2xl font-semibold">{`${side} in ${title} at ${tournamentName}`}</h3>
            </div>
            <div className="p-1 border border-gray-700 bg-gray-800 rounded">
              <div className="p-3">{renderTable(rows)}</div>
            </div>
          </div>
        );
      }

      // otherwise show the grid of rounds with top lists
      return (
        <div className="text-white">
          <div className="mb-3 text-center">
            <h3 className="text-2xl font-semibold">{safeSection === 'youngestrounds' ? 'Youngest per Round' : 'Oldest per Round'}</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {items.map((item: any) => (
              <div key={item.title} className="p-1 border border-gray-700 bg-gray-800 rounded">
                <div className="p-3">
                  <h4 className="text-white font-medium mb-2">{item.title}</h4>
                  {renderTable(item.list ?? [])}
                  <div className="mt-2">
                    <a href={`/tournaments/${id}/records/ages/${safeSection}/${encodeURIComponent(String(item.title))}`} className="mt-2 inline-block px-4 py-2 bg-blue-500 text-white rounded">View All</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    const tournamentName = await getTournamentName(id);
    const heading = `${safeSection.charAt(0).toUpperCase() + safeSection.slice(1)} at ${tournamentName}`;

    return (
      <div className="text-white">
        <div className="mb-3 text-center">
          <h3 className="text-2xl font-semibold">{heading}</h3>
        </div>

        <div className="p-4 text-gray-300">
          <p>This is the server-rendered Ages full page placeholder.</p>
          {title ? <p className="mt-2">Title: {title}</p> : null}
        </div>
      </div>
    );
  } catch (err: any) {
    return (
      <div className="text-white">
        <div className="mb-3 text-center">
          <h3 className="text-2xl font-semibold">Ages</h3>
        </div>
        <div className="p-4 text-red-400">Error loading ages data: {String(err?.message ?? err)}</div>
      </div>
    );
  }
}
