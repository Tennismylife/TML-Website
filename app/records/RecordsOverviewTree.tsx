import Link from 'next/link';

type Node = { key: string; label: string; href?: string; children?: Node[] };

const treeData: Node[] = [
  { key: 'wins', label: 'Wins', href: '/records/wins' },
  { key: 'played', label: 'Played', href: '/records/played' },
  { key: 'count', label: 'Count', href: '/records/count' },
  { key: 'titles', label: 'Titles', href: '/records/titles' },
  { key: 'entries', label: 'Entries', href: '/records/entries' },
  {
    key: 'ages',
    label: 'Ages',
    children: [
      { key: 'oldest', label: 'Oldest Main Draw', href: '/records/ages/oldest' },
      { key: 'youngest', label: 'Youngest Main Draw', href: '/records/ages/youngest' },
      { key: 'oldest-winners', label: 'Oldest Title Winners', href: '/records/ages/oldest-winners' },
      { key: 'youngest-winners', label: 'Youngest Title Winners', href: '/records/ages/youngest-winners' },
      { key: 'allrounds', label: 'All Rounds (Top lists)', href: '/records/ages/allrounds' },
    ],
  },
  {
    key: 'timespan',
    label: 'Timespan',
    children: [
      { key: 'entries', label: 'Entries', href: '/records/timespan/entries' },
      { key: 'titles', label: 'Titles', href: '/records/timespan/titles' },
      { key: 'rounds', label: 'Rounds', href: '/records/timespan/rounds' },
    ],
  },
  { key: 'percentage', label: 'Percentage', href: '/records/percentage' },
  {
    key: 'roundsonentries',
    label: 'Rounds on Entries',
    children: [
      { key: 'titles', label: 'Titles', href: '/records/roundsonentries/titles' },
      { key: 'round', label: 'Round', href: '/records/roundsonentries/round' },
    ],
  },
  {
    key: 'same',
    label: 'Same (same tournament)',
    children: [
      { key: 'wins', label: 'Wins', href: '/records/same/wins' },
      { key: 'played', label: 'Played', href: '/records/same/played' },
      { key: 'entries', label: 'Entries', href: '/records/same/entries' },
      { key: 'titles', label: 'Titles', href: '/records/same/titles' },
      { key: 'round', label: 'Round', href: '/records/same/round' },
    ],
  },
  {
    key: 'seasons',
    label: 'Seasons',
    children: [
      { key: 'wins', label: 'Wins', href: '/records/seasons/wins' },
      { key: 'played', label: 'Played', href: '/records/seasons/played' },
      { key: 'entries', label: 'Entries', href: '/records/seasons/entries' },
      { key: 'titles', label: 'Titles', href: '/records/seasons/titles' },
      { key: 'round', label: 'Round', href: '/records/seasons/round' },
      { key: 'percentage', label: 'Percentage', href: '/records/seasons/percentage' },
    ],
  },
  {
    key: 'ageofnth',
    label: 'Age at Nth',
    children: [
      { key: 'wins', label: 'Wins', href: '/records/ageofnth/wins' },
      { key: 'played', label: 'Played', href: '/records/ageofnth/played' },
      { key: 'entries', label: 'Entries', href: '/records/ageofnth/entries' },
      { key: 'titles', label: 'Titles', href: '/records/ageofnth/titles' },
      { key: 'slams', label: 'Slams', href: '/records/ageofnth/slams' },
      { key: 'round', label: 'Round', href: '/records/ageofnth/round' },
    ],
  },
  { key: 'neededto', label: 'Needed To', children: [{ key: 'titles', label: 'Titles', href: '/records/neededto/titles' }] },
  { key: 'counterseasons', label: 'Counter Seasons', children: [{ key: 'round', label: 'Round', href: '/records/counterseasons/round' }, { key: 'titles', label: 'Titles', href: '/records/counterseasons/titles' }] },
  {
    key: 'h2h',
    label: 'H2H',
    children: [
      { key: 'count', label: 'Count', href: '/records/h2h/count' },
      { key: 'seasons', label: 'Seasons', href: '/records/h2h/seasons' },
      { key: 'same', label: 'Same tournament', href: '/records/h2h/same' },
    ],
  },
  { key: 'streak', label: 'Streak', children: [{ key: 'wins', label: 'Wins', href: '/records/streak/wins' }, { key: 'round', label: 'Round', href: '/records/streak/round' }] },
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