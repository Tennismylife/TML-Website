import React from 'react';
import Link from 'next/link';
import Flag from '@/components/Flag';
import { getCountSection } from '@/lib/records/count';
import { getPlayerHref } from '@/lib/utils';
import { prisma } from '@/lib/prisma';
import { resolveCanonicalTourneyId } from '@/lib/tournament';

function extractFirst(value: any): string {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(extractFirst).find(Boolean) || '';
  if (typeof value === 'object') return Object.values(value).map(extractFirst).find(Boolean) || '';
  return '';
}
function humanizeName(name: string) {
  return name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function CountFull({ id, section }: { id: string; section: 'titles' | 'wins' | 'played' | 'entries' }) {
  const list = await getCountSection(id, section);

  // Resolve tournament name server-side
  let tourneyName = String(id);
  try {
    const canonicalId = await resolveCanonicalTourneyId(id);
    const lookupId = canonicalId ? parseInt(canonicalId, 10) : (isNaN(Number(id)) ? undefined : Number(id));
    const tournament = lookupId ? await prisma.tournament.findUnique({ where: { id: lookupId } }) : await prisma.tournament.findUnique({ where: { slug: id } });
    const rawName = extractFirst(tournament?.name) || `Tournament ${tournament?.id ?? id}`;
    tourneyName = humanizeName(rawName);
  } catch (e) {
    // ignore and fall back to id
  }

  const heading = section === 'titles' ? `Most Titles at ${tourneyName}` : section === 'wins' ? `Most Wins at ${tourneyName}` : section === 'played' ? `Most Matches Played at ${tourneyName}` : `Most Entries at ${tourneyName}`;

  return (
    <div className="max-w-4xl mx-auto text-white p-4">
      <div className="rounded-2xl bg-gray-900/80 p-4 text-center">
        <h3 className="text-2xl font-semibold mb-4">{heading}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-lg md:text-xl border-collapse table-fixed text-center">
            <colgroup>
              <col style={{ width: '70%' }} />
              <col style={{ width: '30%' }} />
            </colgroup>
            <thead className="bg-gray-800">
              <tr>
                <th className="text-center py-2 text-gray-300">Player</th>
                <th className="text-center py-2 text-gray-300">Count</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item: any) => (
                <tr key={item.id} className="border-b border-gray-700">
                  <td className="py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Flag ioc={item.ioc} className="w-4 h-3" />
                      <Link href={getPlayerHref(item.slug ?? String(item.id))} className="text-blue-400 hover:underline text-lg md:text-xl">
                        {item.name}
                      </Link>
                    </div>
                  </td>
                  <td className="py-2 text-center text-lg md:text-xl">{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
