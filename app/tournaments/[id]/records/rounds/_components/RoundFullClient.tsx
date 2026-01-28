'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import Flag from '@/components/Flag';
import { getPlayerHref } from '@/lib/utils';

const TableVirtuoso = dynamic(() => import('react-virtuoso').then(mod => mod.TableVirtuoso), { ssr: false });

function StaticRoundTable({ rows, heading, nestedRenderTable = false }: any) {
  return (
    <div className="rounded-2xl bg-gray-900/80 p-4 text-center">
      {heading ? <h2 className="sr-only">{heading}</h2> : null}
      <div className="overflow-x-auto">
        <div className="p-1 border border-gray-700 bg-gray-800 rounded">
          <div className="p-3">
            {nestedRenderTable ? (
              <div className="overflow-x-auto">
                <table className="w-full text-lg md:text-xl border-collapse table-fixed text-center">
                  <colgroup>
                    <col style={{ width: '70%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="text-center py-2 text-gray-300">Player</th>
                      <th className="text-center py-2 text-gray-300">Reaches</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any) => (
                      <tr key={r.id} className="border-b border-gray-700">
                        <td className="py-2 text-center">
                          <div className="flex items-center justify-center gap-2"><Flag ioc={r.ioc} className="w-4 h-3" /><a href={getPlayerHref(r.slug ?? String(r.id))} className="text-blue-400 hover:underline text-lg md:text-xl">{r.name}</a></div>
                        </td>
                        <td className="py-2 text-center text-lg md:text-xl">{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <table className="w-full text-lg md:text-xl border-collapse table-fixed text-center">
                <colgroup>
                  <col style={{ width: '70%' }} />
                  <col style={{ width: '30%' }} />
                </colgroup>
                <thead className="bg-gray-800">
                  <tr>
                    <th className="text-center py-2 text-gray-300">Player</th>
                    <th className="text-center py-2 text-gray-300">Reaches</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any) => (
                    <tr key={r.id} className="border-b border-gray-700">
                      <td className="py-2 text-center">
                        <div className="flex items-center justify-center gap-2"><Flag ioc={r.ioc} className="w-4 h-3" /><a href={getPlayerHref(r.slug ?? String(r.id))} className="text-blue-400 hover:underline text-lg md:text-xl">{r.name}</a></div>
                      </td>
                      <td className="py-2 text-center text-lg md:text-xl">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InnerRoundContent({ rows, loading, error, heading, mode = 'interactive' }: any) {
  if (mode === 'static') return <StaticRoundTable rows={rows} heading={heading} />;

  return (
    <div className="rounded-2xl bg-gray-900/80 p-4 text-center">
      {heading ? <h2 className="sr-only">{heading}</h2> : null}
      <div className="overflow-x-auto">
        <TableVirtuoso
          data={rows}
          components={{ TableRow: ({ style, ...props }: any) => <tr className="border-b border-gray-700" style={style} {...props} /> }}
          fixedHeaderContent={() => (
            <tr>
              <th className="text-center py-2 text-gray-300">Player</th>
              <th className="text-center py-2 text-gray-300">Reaches</th>
            </tr>
          )}
          itemContent={(index, item: any) => (
            <>
              <td className="py-2 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Flag ioc={item.ioc} className="w-4 h-3" />
                  <a href={getPlayerHref(item.slug ?? String(item.id))} className="text-blue-400 hover:underline text-lg md:text-xl">{item.name}</a>
                </div>
              </td>
              <td className="py-2 text-center text-lg md:text-xl">{item.count}</td>
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
export default function RoundFullClient({ id, round, initialList }: { id: string; round: string; initialList: any[] }) {
  const [mounted, setMounted] = React.useState(false);
  const [rows, setRows] = React.useState<any[]>(initialList ?? []);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/tournaments/${encodeURIComponent(id)}/records/rounds?round=${encodeURIComponent(round)}&full=true`);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const payload = await res.json();
        const full = payload?.roundItems?.[0]?.fullList ?? [];
        if (!alive) return;
        if (Array.isArray(full) && full.length) setRows(full);
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
  }, [mounted, id, round]);

  // Render nothing on SSR/initial hydration so server HTML always matches.
  if (!mounted) return null;

  const fallbackId = `round-full-static-${round}`;
  const mode = rows.length > (initialList ?? []).length ? 'interactive' : 'static';

  return (
    <>
      <style>{`#${fallbackId}{display:none}`}</style>
      <div className="max-w-4xl mx-auto text-white p-4">
        <InnerRoundContent rows={rows} loading={loading} error={error} heading={undefined} mode={mode} />
      </div>
    </>
  );
}
