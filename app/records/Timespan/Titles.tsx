'use client'

import Link from "next/link";
import { useState, useEffect, type ReactNode } from "react";
import Flag from '@/components/Flag';
import { useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';
import { playerSurfaceOrMatchesUrl } from "../nav";
import { createSlug, getTourneyHref } from "@/lib/utils";

function formatDays(days: number): string {
  const years = Math.floor(days / 365);
  const rem = days % 365;
  return years > 0 ? `${years}y ${rem}d` : `${rem}d`;
}

function Gold({ children }: { children: ReactNode }) {
  return <strong className="!text-amber-300">{children}</strong>;
}

function TourneyLink({ name, year }: { name: string; year?: number }) {
  return (
    <Link
      href={getTourneyHref({ slug: createSlug(name), year })}
      className="!text-orange-300 hover:!text-orange-100 font-semibold"
    >
      {year ? `${name} ${year}` : name}
    </Link>
  );
}

interface TitlesProps {
  selectedSurfaces: Set<string> | string[];
  selectedLevels: Set<string> | string[];
  fetchEnabled?: boolean;
  fetchRequestId?: string | null;
  description?: string;
  initialData?: any[];
}

export default function Titles({
  selectedSurfaces,
  selectedLevels,
  fetchEnabled,
  fetchRequestId,
  description,
  initialData
}: TitlesProps) {
  const [data, setData] = useState<any[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;
  const searchParams = useSearchParams();

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels]);

  // Only fetch when explicitly requested (enabled) or when the modal is opened (lazy load on "View All")
  const enabled = !!fetchEnabled;

  useEffect(() => {
    // If server provided `initialData`, allow the client to re-fetch so the
    // SSR top‑10 will be replaced by the full `limit=100` client result.
    if (!(enabled || showModal || (Array.isArray(initialData) && initialData.length > 0))) {
      if (Array.isArray(initialData)) setData(initialData);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('level', l));
        query.set('limit', showModal ? '1000' : '100');
        const url = `/api/records/timespan/titles?${query.toString()}`;
        // fetching titles list
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch titles');
        const fetchedData = await res.json();
        setData(fetchedData.data || []);
      } catch (err) {
        console.error(err);
        setData([]);
        setError(err instanceof Error ? err.message : 'Error loading data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, enabled, showModal, initialData]);

  const totalPages = Math.ceil(data.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = data.slice(start, start + perPage);
  const hasRows = data.length > 0;

  const selectedSurfacesArray = Array.isArray(selectedSurfaces)
    ? selectedSurfaces
    : Array.from(selectedSurfaces);
  const selectedLevelsArray = Array.isArray(selectedLevels)
    ? selectedLevels
    : Array.from(selectedLevels);
  const isBaseTitleTimespan =
    description === 'Longest Timespan Between Two ATP Titles' &&
    selectedSurfacesArray.length === 0 &&
    selectedLevelsArray.length === 0;
  const isGrandSlamTitleTimespan =
    description === 'Longest Timespan Between Two Grand Slam Titles' &&
    selectedSurfacesArray.length === 0 &&
    selectedLevelsArray.length === 1 &&
    selectedLevelsArray.includes('G');
  const isMasters1000TitleTimespan =
    description === 'Longest Timespan Between Two Masters 1000 Titles' &&
    selectedSurfacesArray.length === 0 &&
    selectedLevelsArray.length === 1 &&
    selectedLevelsArray.includes('M');

  const renderTable = (rows: any[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-gray-800 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-800">
            <th className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300">#</th>
            <th className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300">Player</th>
            <th className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300">First Tournament</th>
            <th className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300">First Date</th>
            <th className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300">Last Tournament</th>
            <th className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300">Last Date</th>
            <th className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300">Timespan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, idx) => {
            const globalIdx = startIndex + idx + 1;
            return (
              <tr key={`${p.id}-${idx}`} className="hover:bg-gray-800 border-b border-gray-800">
                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300 font-medium">{globalIdx}</td>
                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-200 flex items-center justify-center gap-2">
                  <Flag ioc={p.ioc} className="w-4 h-3" />
                  <Link href={playerSurfaceOrMatchesUrl((p as any).slug ?? String(p.id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="text-gray-300 hover:underline">{p.name}</Link>
                </td>
                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-200">{p.firstTourney}</td>
                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300">{p.firstDate}</td>
                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-200">{p.lastTourney}</td>
                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300">{p.lastDate}</td>
                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300 font-medium">{p.spanDays}d <span className="text-base font-normal" style={{color:'#facc15'}}>({formatDays(p.spanDays)})</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      {error ? (
        <div className="text-center py-8 text-gray-300">{error}</div>
      ) : loading && !hasRows ? (
        <div className="text-center py-8 text-gray-300">Loading...</div>
      ) : hasRows ? (
        <>
      {description && (
        <h2 className="mb-6 text-center text-2xl font-semibold text-white">
          {description}
        </h2>
      )}

      {isGrandSlamTitleTimespan && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the list for <strong>Longest Timespan Between Two Grand Slam Titles</strong> stands <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, whose major-winning span runs from <TourneyLink name="Roland Garros" year={2005} /> to <TourneyLink name="Roland Garros" year={2022} /> for <Gold>6,209 days</Gold>, or <Gold>17 years and 4 days</Gold> by tournament-start-date convention. Nadal’s first Grand Slam title came in Paris in 2005, when he beat <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Mariano Puerta</span></span> in the final, and his last came at <TourneyLink name="Roland Garros" year={2022} />, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="NOR" className="w-4 h-3" /><span>Casper Ruud</span></span> to win a record 14th French Open title.
          </p>
          <p>
            Just behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, whose span from <TourneyLink name="Australian Open" year={2008} /> to <TourneyLink name="US Open" year={2023} /> covers <Gold>5,705 days</Gold>, or <Gold>15 years and 230 days</Gold>. Djokovic won his first major by beating <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Jo-Wilfried Tsonga</span></span> in the Australian Open 2008 final, and his 24th by defeating <span className="inline-flex items-center gap-2"><Flag ioc="RUS" className="w-4 h-3" /><span>Daniil Medvedev</span></span> at the <TourneyLink name="US Open" year={2023} />.
          </p>
          <p>
            The next benchmark is <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, from <TourneyLink name="Wimbledon" year={2003} /> to <TourneyLink name="Australian Open" year={2018} />, at <Gold>5,320 days</Gold>, or <Gold>14 years and 210 days</Gold>. Federer’s first Slam title came at Wimbledon against <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Mark Philippoussis</span></span>, while his final major came in Melbourne against <span className="inline-flex items-center gap-2"><Flag ioc="CRO" className="w-4 h-3" /><span>Marin Čilić</span></span>.
          </p>
          <p>
            Behind the Big Three, the classic Open Era benchmarks are <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span>, from <TourneyLink name="US Open" year={1990} /> to <TourneyLink name="US Open" year={2002} /> at <Gold>4,382 days</Gold>, and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span> plus <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Boris Becker</span></span>, both listed at <Gold>3,857 days</Gold> between their first and last major titles.
          </p>
          <p>
            A separate all-time reference point is <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Ken Rosewall</span></span>, whose Grand Slam title span runs from Australian Championships 1953 to <TourneyLink name="Australian Open" year={1972} /> for roughly <Gold>19 years</Gold>. Because his first major title came before the Open Era, he remains best treated as the all-time bridge rather than the strict Open Era leader.
          </p>
          <p>
            In this record, the milestone is not simply winning many majors, but remaining capable of winning them across eras: Nadal set the Open Era ceiling at more than 17 years, Djokovic is the closest modern challenger, Federer remains the previous Big Three benchmark, and Rosewall is the historical bridge across eras.
          </p>
        </div>
      )}

      {isMasters1000TitleTimespan && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the list for <strong>Longest Timespan Between Two Masters 1000 Titles</strong> stands <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, whose Masters 1000 title-winning span runs from <TourneyLink name="Hamburg Masters" year={2002} /> to <TourneyLink name="Miami Masters" year={2019} /> for <Gold>6,153 days</Gold>, or <Gold>16 years and 313 days</Gold> by tournament-week date convention. Federer’s first Masters 1000 title came at Hamburg 2002, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="RUS" className="w-4 h-3" /><span>Marat Safin</span></span> 6-1, 6-3, 6-4 on clay, and his last came at Miami 2019, where he beat <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John Isner</span></span> 6-1, 6-4 for his 28th and final Masters 1000 title and his 101st career title.
          </p>
          <p>
            Just behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, whose span from <TourneyLink name="Miami Masters" year={2007} /> to <TourneyLink name="Paris Masters" year={2023} /> covers <Gold>6,069 days</Gold>, or <Gold>16 years and 229 days</Gold>. Djokovic’s latest Masters 1000 title came at Paris 2023, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="BUL" className="w-4 h-3" /><span>Grigor Dimitrov</span></span> 6-4, 6-3 to win his record-extending 40th Masters 1000 crown.
          </p>
          <p>
            The next benchmark is <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, from <TourneyLink name="Monte-Carlo Masters" year={2005} /> to <TourneyLink name="Rome Masters" year={2021} />, at <Gold>5,871 days</Gold>, or <Gold>16 years and 31 days</Gold>. Nadal’s final Masters 1000 title came at Rome 2021, where he beat Djokovic 7-5, 1-6, 6-3 to win his 10th Italian Open and record-equalling 36th Masters 1000 title.
          </p>
          <p>
            Behind the Big Three, the classic Masters 1000 benchmarks are <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span>, from <TourneyLink name="Miami Masters" year={1990} /> to <TourneyLink name="Cincinnati Masters" year={2004} />, at <Gold>5,253 days</Gold>, or <Gold>14 years and 143 days</Gold>. Then come <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><span>Andy Murray</span></span>, from <TourneyLink name="Cincinnati Masters" year={2008} /> to <TourneyLink name="Paris Masters" year={2016} />, and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span>, from <TourneyLink name="Cincinnati Masters" year={1992} /> to <TourneyLink name="Miami Masters" year={2000} />,
          </p>
          <p>
            In this record, the milestone is not simply winning many Masters titles, but staying capable of winning them across tennis eras: Federer set the ceiling at more than 16 years, Djokovic is the closest modern challenger, Nadal provides the clay-court benchmark, and Agassi, Murray and Sampras remain the classic Open Era references.
          </p>
        </div>
      )}

      {isBaseTitleTimespan && (
<div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
  <p>
    At the top of the Open Era list for the longest timespan between two ATP singles titles stands{" "}
    <span className="inline-flex items-center gap-2">
      <Flag ioc="FRA" className="w-4 h-3" />
      <span>Gael Monfils</span>
    </span>
    , whose title span runs from <TourneyLink name="Sopot" year={2005} /> to <TourneyLink name="Auckland" year={2025} /> for <Gold>7,098 days</Gold>, or <Gold>19 years and 163 days</Gold>.
  </p>

  <p>
    Just behind him is{" "}
    <span className="inline-flex items-center gap-2">
      <Flag ioc="SRB" className="w-4 h-3" />
      <span>Novak Djokovic</span>
    </span>
    , from <TourneyLink name="Amersfoort" year={2006} /> to <TourneyLink name="Athens" year={2025} />, at <Gold>7,049 days</Gold> or <Gold>19 years and 114 days</Gold>. Right after him comes{" "}
    <span className="inline-flex items-center gap-2">
      <Flag ioc="SUI" className="w-4 h-3" />
      <span>Roger Federer</span>
    </span>
    , whose title span goes from <TourneyLink name="Milan" year={2001} /> to <TourneyLink name="Basel" year={2019} /> and covers <Gold>6,839 days</Gold>, or <Gold>18 years and 269 days</Gold>.
  </p>

  <p>
    The next historical benchmark is{" "}
    <span className="inline-flex items-center gap-2">
      <Flag ioc="ESP" className="w-4 h-3" />
      <span>Rafael Nadal</span>
    </span>
    , from <TourneyLink name="Sopot" year={2004} /> to <TourneyLink name="Roland Garros" year={2022} />, at <Gold>6,496 days</Gold> or <Gold>17 years and 291 days</Gold>. Behind Nadal sits{" "}
    <span className="inline-flex items-center gap-2">
      <Flag ioc="USA" className="w-4 h-3" />
      <span>Jimmy Connors</span>
    </span>
    , whose title span runs from <TourneyLink name="Jacksonville" year={1972} /> to <TourneyLink name="Tel Aviv" year={1989} /> for <Gold>6,487 days</Gold>, or <Gold>17 years and 282 days</Gold>.
  </p>

  <p>
    Behind that first tier, the current record table continues with{" "}
    <span className="inline-flex items-center gap-2">
      <Flag ioc="USA" className="w-4 h-3" />
      <span>Andre Agassi</span>
    </span>{" "}
    at <Gold>6,454 days</Gold> from <TourneyLink name="Itaparica" year={1987} /> to <TourneyLink name="Los Angeles" year={2005} />, followed by{" "}
    <span className="inline-flex items-center gap-2">
      <Flag ioc="FRA" className="w-4 h-3" />
      <span>Richard Gasquet</span>
    </span>{" "}
    at <Gold>6,419 days</Gold> from <TourneyLink name="Nottingham" year={2005} /> to <TourneyLink name="Auckland" year={2023} />, and{" "}
    <span className="inline-flex items-center gap-2">
      <Flag ioc="AUS" className="w-4 h-3" />
      <span>Lleyton Hewitt</span>
    </span>{" "}
    at <Gold>6,027 days</Gold> from <TourneyLink name="Adelaide" year={1998} /> to <TourneyLink name="Newport" year={2014} />.
  </p>

  <p>
    In the current table, the key point is that the gap is what matters, not title count: Monfils leads the list at <Gold>7,098 days</Gold>, Djokovic is the closest challenger at <Gold>7,049 days</Gold>, Federer and Nadal form the next tier, and Connors remains the classic Open Era bridge across generations.
  </p>
</div>
      )}

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {renderTable(currentData, start)}

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}

      <Modal show={showModal} onClose={() => setShowModal(false)} title={description ?? 'Biggest Timespan Between 2 Titles'}>
        {renderTable(data)}
      </Modal>
        </>
      ) : (
        <div className="text-center py-8 text-gray-300">No data available.</div>
      )}
    </section>
  );
}
