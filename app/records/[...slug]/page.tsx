import { Metadata } from 'next';
import { metadataBase } from '../../layout';
import { generateRecordDescription } from '../../../lib/generateRecordDescription';
import RecordsFilteredClient from './RecordsFilteredClient';

type Params = { slug?: string[] };
type SearchParams = Record<string, string | string[] | undefined>;

function kebabToKey(s: string | undefined) {
  if (!s) return s;
  return s.split('-').map((part, idx) => idx === 0 ? part : (part.charAt(0).toUpperCase() + part.slice(1))).join('');
}

export async function generateStaticParams() {
  const tabs = [
    'wins','played','count','titles','entries','ages','timespan','percentage','roundsonentries','same','seasons','atage','ageofnth','neededto','counterseasons','h2h','streak'
  ];

  const subTabsMap: Record<string,string[]> = {
    ages: ['oldest','youngest','oldest-winners','youngest-winners'],
    timespan: ['entries','titles','rounds'],
    roundsonentries: ['titles','round'],
    same: ['wins','played','entries','titles','round'],
    seasons: ['wins','played','entries','titles','round','percentage'],
    atage: ['wins','played','entries','titles','slams','round'],
    ageofnth: ['wins','played','entries','titles','slams','round'],
    neededto: ['titles'],
    counterseasons: ['round','titles'],
    streak: ['wins','round'],
    h2h: ['count'],
  };

  const params: { slug: string[] }[] = [];
  tabs.forEach(t => params.push({ slug: [t] }));
  Object.entries(subTabsMap).forEach(([k, arr]) => {
    arr.forEach(s => params.push({ slug: [k, s] }));
  });
  return params;
}

export async function fetchRecordData(record: string | null, sub?: string | null) {
  if (!record) return [] as any[];
  const path = `/api/records/${encodeURIComponent(record)}${sub ? '/' + encodeURIComponent(sub) : ''}`;
  const url = new URL(path, metadataBase).toString();
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return [] as any[];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return [] as any[];
  }
}

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: SearchParams; }): Promise<Metadata> {
  const slug = params.slug || [];
  const record = slug[0] ?? null;
  const sub = slug[1] ?? null;

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

  const titleBase = record ? `${record}${sub ? ' — ' + sub : ''}` : 'Records';
  const desc = generateRecordDescription(record, activeSubTabsDefault, new Set(), new Set(), '', null);

  const hasQueryParams = Object.keys(searchParams || {}).length > 0;
  const canonicalPath = record ? `/records/${encodeURIComponent(record)}${sub ? '/' + encodeURIComponent(sub) : ''}` : '/records';
  const canonicalUrl = new URL(canonicalPath, metadataBase).toString();

  return {
    title: `${desc || titleBase} — TML`,
    description: desc || 'TML records and statistics',
    alternates: { canonical: canonicalUrl },
    robots: hasQueryParams ? { index: false, follow: true } : { index: true, follow: true },
  } as Metadata;
}

export default async function SlugPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const slug = params.slug || [];
  const record = slug[0] ?? null;
  const sub = slug[1] ? kebabToKey(slug[1]) : null;
  const hasQueryParams = Object.keys(searchParams || {}).length > 0;

  if (!hasQueryParams) {
    const data = await fetchRecordData(record, sub);

    return (
      <main className="w-full min-h-screen p-4 bg-gray-900 text-white">
        <section className="mb-6 text-gray-200">
          <h1 className="text-2xl sm:text-3xl font-semibold mb-2 text-white">{record ? `${record.toUpperCase()} Records` : 'Records'}</h1>
          <p className="text-gray-300">{record ? `Record page for ${record}${sub ? ` / ${sub}` : ''}` : 'All records'}</p>
        </section>

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
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen p-4 bg-gray-900 text-white">
      <section className="mb-6 text-gray-200">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2 text-white">{record ? `${record.toUpperCase()} Records` : 'Records'}</h1>
        <p className="text-gray-300">Filtered view — results are loaded client-side.</p>
      </section>

      <RecordsFilteredClient
        record={record}
        sub={sub}
        filters={searchParams}
        canonicalUrl={new URL(`/records/${record}${sub ? `/${sub}` : ''}`, metadataBase).toString()}
      />
    </main>
  );
}
