'use client';

import React from 'react';
import Link from 'next/link';
import Flag from '@/components/Flag';
import { getPlayerHref } from '@/lib/utils';
import { getRoundFullName } from '@/lib/utils';
import dynamic from 'next/dynamic';

const TableVirtuoso = dynamic(() => import('react-virtuoso').then(mod => mod.TableVirtuoso), { ssr: false });

interface PlayerRound {
  id: number;
  name: string;
  ioc: string;
  slug?: string;
  count: number;
}

export default function RoundFull({ list, round, tourneyName }: { list: PlayerRound[]; round: string; tourneyName: string }) {

  return (
    <div className="max-w-4xl mx-auto text-white p-4">
      <div className="rounded-2xl bg-gray-900/80 p-4 text-center">
        <h2 className="sr-only">{`Most ${getRoundFullName(round)} Appearances at the ${tourneyName}`}</h2>
        <TableVirtuoso
          data={list}
          components={{
            TableRow: ({ style, ...props }) => (
              <tr className="border-b border-gray-700" style={style} {...props} />
            ),
          }}
          fixedHeaderContent={() => (
            <tr>
              <th className="text-center py-2 text-gray-300">Player</th>
              <th className="text-center py-2 text-gray-300">Reaches</th>
            </tr>
          )}
          itemContent={(index, item: PlayerRound) => (
            <>
              <td className="py-2 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Flag ioc={item.ioc} className="w-4 h-3" />
                  <Link href={getPlayerHref(item.slug ?? String(item.id))} className="text-blue-400 hover:underline text-lg md:text-xl">
                    {item.name}
                  </Link>
                </div>
              </td>
              <td className="py-2 text-center text-lg md:text-xl">{item.count}</td>
            </>
          )}
          style={{ height: '600px' }}
        />
      </div>
    </div>
  );
}
