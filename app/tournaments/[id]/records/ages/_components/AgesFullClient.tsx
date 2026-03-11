'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import Flag from '@/components/Flag';
import { playerMatchesUrl } from '../../../../../records/nav';

const TableVirtuoso = dynamic(() => import('react-virtuoso').then(mod => mod.TableVirtuoso), { ssr: false });

function formatAge(age: number) {
  const a = Number(age) || 0;
  const years = Math.floor(a);
  const days = Math.round((a - years) * 365.25);
  return `${years}y ${days}d`;
}

function StaticTable({ rows, heading, showYear = true, id }: any) {
  return (
    <div className="rounded-2xl bg-gray-900/80 p-4 text-center">
      {heading ? <h3 className="text-2xl font-semibold mb-3">{heading}</h3> : null}
      <div className="overflow-x-auto">
        <div className="p-1 border border-gray-700 bg-gray-800 rounded">
          <div className="p-3">
            <div className="overflow-x-auto">
              <table className="w-full text-lg md:text-xl border-collapse table-fixed text-center">
                <colgroup>
                  <col style={{ width: '60%' }} />
                  <col style={{ width: showYear ? '20%' : '40%' }} />
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
                  {rows.map((r: any) => (
                    <tr key={`${r.id}-${r.year}-${String(r.age || '')}`} className="border-b border-gray-700">
                      <td className="py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Flag ioc={r.ioc} className="w-4 h-3" />
                          <a href={playerMatchesUrl(r.slug ?? String(r.id))} className="text-blue-400 hover:underline text-lg md:text-xl">{r.name}</a>
                        </div>
                      </td>
                      <td className="py-2 text-center text-lg md:text-xl text-white">{formatAge(r.age)}</td>
                      {showYear && (
                        <td className="py-2 text-center text-lg md:text-xl text-white">
                          {/* always link to the current route id (slug when available); the
                              server data sometimes returns the numeric tourney_id which can
                              slip in before the slug is known. */}
                          <a href={`/tournaments/${id}/${r.year}`} className="text-blue-400 hover:underline">{r.year}</a>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InnerContent({ rows, loading, error, heading, mode = 'interactive', showYear = true, id }: any) {
  if (mode === 'static') {
    return <StaticTable rows={rows} heading={heading} showYear={showYear} id={id} />;
  }

  return (
    <div className="rounded-2xl bg-gray-900/80 p-4 text-center">
      {heading ? <h3 className="text-2xl font-semibold mb-3">{heading}</h3> : null}
      <div className="overflow-x-auto">
        <TableVirtuoso
          data={rows}
          components={{
            TableRow: ({ style, ...props }: any) => <tr className="border-b border-gray-700" style={style} {...props} />,
          }}
          fixedHeaderContent={() => (
            <tr>
              <th className="text-center py-2 text-gray-300">Player</th>
              <th className="text-center py-2 text-gray-300">Age</th>
              {showYear && <th className="text-center py-2 text-gray-300">Year</th>}
            </tr>
          )}
          itemContent={(index, item: any) => (
            <>
              <td className="py-2 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Flag ioc={item.ioc} className="w-4 h-3" />
                  <a href={playerMatchesUrl(item.slug ?? String(item.id))} className="text-blue-400 hover:underline text-lg md:text-xl">{item.name}</a>
                </div>
              </td>
              <td className="py-2 text-center text-lg md:text-xl">{formatAge(item.age)}</td>
              {showYear && (
                <td className="py-2 text-center text-lg md:text-xl">
                  {/* use the current route id (slug) rather than the raw tourney_id */}
                  <a href={`/tournaments/${id}/${item.year}`} className="text-blue-400 hover:underline">{item.year ?? ''}</a>
                </td>
              )}
            </>
          )}
          style={{ height: '600px' }}
        />
      </div>
      {loading && (<div className="mt-2 text-sm text-gray-300">Loading more…</div>)}
      {error && (<div className="mt-2 text-sm text-red-400">{error}</div>)}
    </div>
  );
}

export default function AgesFullClient({
  id,
  section,
  title,
  which,
  initialRows,
}: {
  id: string;
  section: string;
  title?: string;
  which?: 'youngest' | 'oldest';
  initialRows?: any[];
}) {
  const [mounted, setMounted] = React.useState(false);
  const [heading, setHeading] = React.useState<string | undefined>(undefined);
  const [rows, setRows] = React.useState<any[]>(initialRows ?? []);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fallbackId = `ages-full-static-${section}-${encodeURIComponent(String(title ?? (which ?? '')))}`;
  const showYear = true;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      const h = document.getElementById(fallbackId)?.querySelector('h3')?.textContent ?? undefined;
      if (h) setHeading(h);
    } catch (e) {}
  }, [mounted, fallbackId]);

  useEffect(() => {
    if (!mounted) return;
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/tournaments/${encodeURIComponent(id)}/records/ages/${encodeURIComponent(section)}?full=true`);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();

        let foundRows: any[] = [];
        if (section === 'youngestrounds' || section === 'oldestrounds') {
          const listKey = section === 'youngestrounds' ? 'allYoungestItems' : 'allOldestItems';
          const all = data[listKey] ?? [];
          if (title) {
            const decodedTitle = decodeURIComponent(String(title));
            const found = all.find((it: any) => String(it.title) === String(title) || String(it.title) === decodedTitle);
            foundRows = (found?.fullList ?? found?.list ?? []);
          }
        } else if (section === 'titles') {
          const whichYoung = data.youngestWinners ?? data.topYoungestWinners ?? [];
          const whichOld = data.oldestWinners ?? data.topOldestWinners ?? [];
          if (which === 'youngest') foundRows = whichYoung;
          else if (which === 'oldest') foundRows = whichOld;
          else if ((initialRows ?? []).length && (initialRows ?? [])[0]?.age && (whichYoung.length >= (initialRows ?? []).length)) {
            foundRows = whichYoung;
          } else {
            foundRows = whichOld.length ? whichOld : whichYoung;
          }
        } else if (section === 'main') {
          const topYoungest = data.topYoungest ?? data.youngestPlayers ?? [];
          const topOldest = data.topOldest ?? data.oldestPlayers ?? [];
          if (which === 'youngest') foundRows = topYoungest;
          else if (which === 'oldest') foundRows = topOldest;
        }

        if (!alive) return;
        if (Array.isArray(foundRows) && foundRows.length) setRows(foundRows);
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message ?? 'Failed to load');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [mounted, id, section, title, which, initialRows]);

  // Render nothing on SSR/initial hydration so the server HTML always matches.
  if (!mounted) return null;

  const mode = rows.length > (initialRows ?? []).length ? 'interactive' : 'static';

  return (
    <>
      <style>{`#${fallbackId}{display:none}`}</style>
      <div className="max-w-4xl mx-auto text-white p-4">
        <InnerContent rows={rows} loading={loading} error={error} heading={heading} mode={mode} showYear={showYear} id={id} />
      </div>
    </>
  );
}
