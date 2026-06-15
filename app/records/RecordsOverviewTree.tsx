import Link from 'next/link';
import { resolveRecordHref } from './record-links';

type Node = { key: string; label: string; href?: string; children?: Node[] };

const recordHref = (slug: string[], filters: Record<string, any> = {}) =>
  resolveRecordHref(slug, filters as any);

const treeData: Node[] = [
  { key: 'wins', label: 'Wins', href: recordHref(['wins']) },
  { key: 'played', label: 'Played', href: recordHref(['played']) },
  { key: 'count', label: 'Count', href: recordHref(['count']) },
  { key: 'titles', label: 'Titles', href: recordHref(['titles']) },
  { key: 'entries', label: 'Entries', href: recordHref(['entries']) },
  {
    key: 'ages',
    label: 'Ages',
    children: [
      { key: 'oldest', label: 'Oldest Main Draw', href: recordHref(['ages', 'oldest']) },
      { key: 'youngest', label: 'Youngest Main Draw', href: recordHref(['ages', 'youngest']) },
      { key: 'oldest-winners', label: 'Oldest Title Winners', href: recordHref(['ages', 'oldest-winners']) },
      { key: 'youngest-winners', label: 'Youngest Title Winners', href: recordHref(['ages', 'youngest-winners']) },
    ],
  },
  {
    key: 'timespan',
    label: 'Timespan',
    children: [
      { key: 'entries', label: 'Entries', href: recordHref(['timespan', 'entries']) },
      { key: 'titles', label: 'Titles', href: recordHref(['timespan', 'titles']) },
      { key: 'rounds', label: 'Between Finals', href: recordHref(['timespan', 'rounds'], { round: 'F' }) },
    ],
  },
  { key: 'percentage', label: 'Percentage', href: recordHref(['percentage']) },
  {
    key: 'roundsonentries',
    label: 'Results by Appearances',
    children: [
      { key: 'titles', label: 'Titles', href: recordHref(['roundsonentries', 'titles']) },
      { key: 'round', label: 'Round', href: recordHref(['roundsonentries', 'round'], { round: 'F' }) },
    ],
  },
  {
    key: 'same',
    label: 'Same (same tournament)',
    children: [
      { key: 'wins', label: 'Wins', href: recordHref(['same', 'wins']) },
      { key: 'played', label: 'Played', href: recordHref(['same', 'played']) },
      { key: 'entries', label: 'Entries', href: recordHref(['same', 'entries']) },
      { key: 'titles', label: 'Titles', href: recordHref(['same', 'titles']) },
      { key: 'round', label: 'Round', href: recordHref(['same', 'round'], { round: 'F' }) },
    ],
  },
  {
    key: 'seasons',
    label: 'Seasons',
    children: [
      { key: 'wins', label: 'Wins', href: recordHref(['seasons', 'wins']) },
      { key: 'played', label: 'Played', href: recordHref(['seasons', 'played']) },
      { key: 'entries', label: 'Entries', href: '/records/most-tournament-appearances-in-single-season' },
      { key: 'titles', label: 'Titles', href: recordHref(['seasons', 'titles']) },
      { key: 'round', label: 'Round', href: recordHref(['seasons', 'round'], { round: 'F' }) },
      { key: 'percentage', label: 'Percentage', href: recordHref(['seasons', 'percentage']) },
    ],
  },
  {
    key: 'ageofnth',
    label: 'Age at Nth',
    children: [
      { key: 'wins', label: 'Wins', href: recordHref(['ageofnth', 'wins']) },
      { key: 'played', label: 'Played', href: recordHref(['ageofnth', 'played']) },
      { key: 'entries', label: 'Entries', href: recordHref(['ageofnth', 'entries']) },
      { key: 'titles', label: 'Titles', href: recordHref(['ageofnth', 'titles']) },
      { key: 'slams', label: 'Slams', href: recordHref(['ageofnth', 'slams']) },
      { key: 'round', label: 'Round', href: recordHref(['ageofnth', 'round']) },
    ],
  },
  { key: 'neededto', label: 'Needed To', children: [{ key: 'titles', label: 'Titles', href: recordHref(['neededto', 'titles']) }] },
  { key: 'counterseasons', label: 'Counter Seasons', children: [{ key: 'round', label: 'Round', href: recordHref(['counterseasons', 'round'], { round: 'F' }) }, { key: 'titles', label: 'Titles', href: recordHref(['counterseasons', 'titles']) }] },
  {
    key: 'h2h',
    label: 'H2H',
    children: [
      { key: 'count', label: 'Count', href: recordHref(['h2h', 'count']) },
    ],
  },
  { key: 'streak', label: 'Streak', children: [{ key: 'wins', label: 'Wins', href: recordHref(['streak', 'wins']) }, { key: 'round', label: 'Round', href: recordHref(['streak', 'round'], { round: 'F' }) }] },
];

export default function RecordsOverviewTree() {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3 text-white">Overview (tree)</h2>
      <div className="flex flex-wrap gap-6 text-gray-300">
        {treeData.map((n) => (
          <div key={n.key} className="min-w-[160px] max-w-xs">
            <div className="text-white font-semibold mb-2">
              {n.href ? <Link href={n.href} className="hover:underline">{n.label}</Link> : n.label}
            </div>
            {n.children && (
              <ul className="list-disc list-inside pl-4">
                {n.children.map(c => (
                  <li key={c.key} className="mb-1 text-gray-300">
                    {c.href ? <Link href={c.href} className="hover:underline">{c.label}</Link> : c.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
