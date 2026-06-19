"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import Flag from '@/components/Flag';
import { getPlayerHref, getTourneyHref, createSlug } from "@/lib/utils";
import { playerSurfaceOrMatchesUrl } from "../nav";
import Pagination from "../../../components/Pagination";
import Modal from "@/components/Modal";

interface Entry {
  id: string;
  name: string;
  ioc?: string;
  entries: number;
  slug?: string | null;
}

export default function Entries({
  fetchEnabled,
  description,
  topEntries,
  selectedSurfaces,
  selectedLevels
}: {
  fetchEnabled?: boolean;
  description?: string;
  topEntries?: Entry[];
  selectedSurfaces?: Set<string>;
  selectedLevels?: Set<string>;
}) {
  const enabled = !!fetchEnabled; // default false
  const [allEntries, setAllEntries] = useState<Entry[]>(Array.isArray(topEntries) ? topEntries : []);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const perPage = 20;

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent)?.detail?.resetPage) setPage(1);
    };

    window.addEventListener('records:reset', handler as EventListener);
    return () => window.removeEventListener('records:reset', handler as EventListener);
  }, []);

  // Always fetch from client when filters change (same pattern as OldestMainDraw)
  useEffect(() => {
    const controller = new AbortController();

    const fetchEntries = async () => {
      setLoading(true);

      try {
        setError(null);
        const params = new URLSearchParams();

        if (selectedSurfaces !== undefined) {
          Array.from(selectedSurfaces).forEach(s => params.append('surface', s));
        }

        if (selectedLevels !== undefined) {
          Array.from(selectedLevels).forEach(l => params.append('level', l));
        }

        params.set('perPage', showModal ? '1000' : '100');
        params.delete('page');

        const res = await fetch(`/api/records/entries?${params.toString()}`, {
          signal: controller.signal
        });

        const data = await res.json();
        const rows = Array.isArray(data.topEntries) ? data.topEntries : [];

        if (!controller.signal.aborted) setAllEntries(rows);
      } catch (err: any) {
        if (err?.name !== 'AbortError') console.error(err);
        if (!controller.signal.aborted) {
          setAllEntries([]);
          setError('Error loading data');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchEntries();

    return () => controller.abort();
  }, [selectedSurfaces, selectedLevels, showModal]);

  const totalCount = allEntries.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const currentEntries = allEntries.slice(start, start + perPage);
  const hasRows = allEntries.length > 0;

  const renderTable = (entriesList: Entry[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-gray-800 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-800">
            <th className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300">Rank</th>
            <th className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300">Player</th>
            <th className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300">Entries</th>
          </tr>
        </thead>

        <tbody>
          {entriesList.map((p, idx) => {
            const globalRank = startIndex + idx + 1;

            return (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-gray-800">
                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-200">
                  {globalRank}
                </td>

                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-200">
                  <div className="flex items-center justify-center gap-2">
                    {p.ioc && <Flag ioc={p.ioc} className="w-4 h-3" />}

                    <Link
                      href={playerSurfaceOrMatchesUrl(
                        p.slug ?? String(p.id),
                        (() => {
                          const params: Record<string, string | string[]> = {};

                          for (const [key, value] of (searchParams?.entries() ?? [])) {
                            if (!value || key === 'tab') continue;

                            if (params[key]) {
                              if (Array.isArray(params[key])) {
                                (params[key] as string[]).push(value);
                              } else {
                                params[key] = [params[key] as string, value];
                              }
                            } else {
                              params[key] = value;
                            }
                          }

                          return params;
                        })()
                      )}
                      className="text-indigo-300 hover:underline"
                    >
                      {p.name}
                    </Link>
                  </div>
                </td>

                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-200">
                  <Link
                    href={`${getPlayerHref((p as any).slug ?? String(p.id))}/tournaments`}
                    className="text-indigo-300 hover:underline"
                  >
                    {p.entries}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      {description && (
        <h2 className="mb-6 text-center text-2xl font-semibold text-white">
          {description}
        </h2>
      )}

      {pathname === '/records/most-appearances' && selectedSurfaces?.size === 0 && selectedLevels?.size === 0 && (
        <article className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for most ATP singles main-draw appearances stands <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Feliciano Lopez</span></span>, with <strong className="!text-amber-300">486</strong> ATP main draws, the highest total recorded in men’s tennis.
          </p>

          <p>
            Lopez’s record is based on tournament presence rather than match dominance: his milestone measures how often he entered an ATP-level singles draw across more than two decades on tour. His first ATP main-draw appearance came at <Link href={getTourneyHref({ slug: createSlug('Barcelona'), year: 1998 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Barcelona 1998</Link>, where he played <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Jiří Novák</span></span> in the first round. His final ATP main draw came at <Link href={getTourneyHref({ slug: createSlug('Mallorca'), year: 2023 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Mallorca 2023</Link>, where he entered as a wildcard and reached the quarter-finals: he opened against <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Max Purcell</span></span>, then faced <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Jordan Thompson</span></span>, before playing his final tour-level singles match against <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Yannick Hanfmann</span></span>.
          </p>

          <p>
            Lopez’s total is also connected to one of the strongest Grand Slam appearance records in men’s tennis history. He played 79 consecutive Grand Slam main draws, from <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 2002 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2002</Link> to the <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2022 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 2022</Link>, and reached 81 total Grand Slam main-draw appearances, tying the men’s all-time record at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2022 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2022</Link>.
          </p>

          <p>
            Behind him stands a group of players whose careers were also defined by repeated ATP main-draw presence across many seasons: <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Fernando Verdasco</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Fabrice Santoro</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Richard Gasquet</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="RUS" className="w-4 h-3" /><span>Mikhail Youzhny</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>John Alexander</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" /><span>Andreas Seppi</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>. Their place in this ranking comes from longevity, calendar consistency and the ability to keep qualifying directly — or returning repeatedly — to ATP singles main draws year after year.
          </p>
        </article>
      )}

{pathname === '/records/most-grand-slam-appearances' && selectedSurfaces?.size === 0 && selectedLevels?.has('G') && (
  <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
    <p>
      At the top of the men’s Grand Slam list for most main draw appearances stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, now the outright record holder with <strong className="!text-amber-300">82</strong> Grand Slam singles main draws. Behind him, <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Feliciano Lopez</span></span> remain tied in second place on <strong className="!text-amber-300">81</strong>.
    </p>

    <p>
      Federer reached the 81 mark first: his Slam journey began at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 1999 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 1999</Link>, where he made his major debut against <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Patrick Rafter</span></span>, and ended at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2021 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2021</Link>, where his final Grand Slam appearance came against <span className="inline-flex items-center gap-2"><Flag ioc="POL" className="w-4 h-3" /><span>Hubert Hurkacz</span></span> in the quarter-finals.
    </p>

    <p>
      Lopez joined Federer on <strong className="!text-amber-300">81</strong> at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2022 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2022</Link>, after receiving a place in the main draw; his major career had begun at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 2001 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2001</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Carlos Moyá</span></span>, and included a men’s record 79 consecutive Grand Slam main draws from <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 2002 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2002</Link> to the <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2022 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 2022</Link>.
    </p>

    <p>
      Djokovic first tied Federer and Lopez at the <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2026 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 2026</Link>, where his first-round match against <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Pedro Martínez</span></span> marked his 81st Grand Slam main draw appearance. He then moved ahead of both to take the outright record with <strong className="!text-amber-300">82</strong> appearances; his first Grand Slam main draw had come twenty-one years earlier at the <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 2005</Link>, against <span className="inline-flex items-center gap-2"><Flag ioc="RUS" className="w-4 h-3" /><span>Marat Safin</span></span>.
    </p>

    <p>
      Behind Djokovic, Federer and Lopez, the next name is <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Stan Wawrinka</span></span>, who reached <strong className="!text-amber-300">76</strong> Grand Slam singles main draw appearances. Just behind him is <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Richard Gasquet</span></span>, who finished his major career around the <strong className="!text-amber-300">75</strong>-appearance mark at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 2025 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2025</Link>. Wawrinka’s Grand Slam path began at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2005</Link> and remained active into the mid-2020s.
    </p>

    <p>
      In this record, the milestone is not winning matches, but simply returning to the main draw again and again: Djokovic has now set the ceiling at <strong className="!text-amber-300">82</strong>, moving one clear of Federer and Lopez, each of whom stopped at <strong className="!text-amber-300">81</strong>.
    </p>
  </div>
)}



      {pathname === '/records/most-masters-1000-appearances' && selectedSurfaces?.size === 0 && selectedLevels?.has('M') && (
        <article className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the ATP Masters 1000 list for most main draw appearances stands <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Feliciano Lopez</span></span>, with <strong className="!text-amber-300">139</strong> Masters 1000 events played, the highest total since the series began in <strong className="!text-amber-300">1990</strong>.             Lopez set the record at <Link href={getTourneyHref({ slug: 'indian-wells-masters', year: 2021 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Indian Wells 2021</Link>, where his first-round match against <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Tommy Paul</span></span> marked his <strong className="!text-amber-300">139th</strong> Masters 1000 appearance, moving him past Roger Federer’s previous benchmark of <strong className="!text-amber-300">138</strong>.
          </p>
          <p>
            Behind him stand <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, both at <strong className="!text-amber-300">138</strong> appearances. Federer’s Masters 1000 journey closed at <Link href={getTourneyHref({ slug: createSlug('Shanghai'), year: 2019 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Shanghai 2019</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Alexander Zverev</span></span> in the quarter-finals, while Djokovic reached the same <strong className="!text-amber-300">138</strong>-appearance mark at <Link href={getTourneyHref({ slug: 'rome-masters', year: 2026 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome 2026</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="HRV" className="w-4 h-3" /><span>Dino Prizmic</span></span> after returning from his spring injury break.
          </p>

          <p>
            Then come <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Fernando Verdasco</span></span>, both on <strong className="!text-amber-300">130</strong> Masters 1000 appearances; Nadal’s final Masters 1000 main draw came at <Link href={getTourneyHref({ slug: createSlug('Rome'), year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome 2024</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="POL" className="w-4 h-3" /><span>Hubert Hurkacz</span></span>, closing a Masters career built around record participation and dominance at <Link href={getTourneyHref({ slug: 'monte-carlo-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo</Link>, <Link href={getTourneyHref({ slug: 'rome-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome</Link>, <Link href={getTourneyHref({ slug: 'madrid-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Madrid</Link> and <Link href={getTourneyHref({ slug: 'canada-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Canada</Link>.
          </p>

          <p>
            Behind them are <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Stan Wawrinka</span></span> with <strong className="!text-amber-300">127</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>David Ferrer</span></span> with <strong className="!text-amber-300">123</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Richard Gasquet</span></span> with <strong className="!text-amber-300">122</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Tomas Berdych</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><span>Andy Murray</span></span> with <strong className="!text-amber-300">119</strong> each.
          </p>

          <p>
            In this record, the milestone is not winning the tournament or even reaching the later rounds: it is simply entering another Masters 1000 main draw, year after year. Lopez set the ceiling at <strong className="!text-amber-300">139</strong>, Federer became the first Big Three benchmark at <strong className="!text-amber-300">138</strong>, and Djokovic — still active — is the only player in position to move the record further.
          </p>
        </article>
      )}

      {pathname === '/records/most-appearances-on-hard-court' && selectedSurfaces?.has('Hard') && selectedLevels?.size === 0 && (
        <article className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for most ATP main-draw appearances in hard-court tournaments stands <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Feliciano Lopez</span></span>, with <strong className="!text-amber-300">279</strong> hard-court main draws, the highest total recorded in this category.
          </p>

          <p>
            Lopez’s hard-court total is built across more than two decades of ATP main-draw entries on the surface. His final hard-court ATP main draw came at <Link href={getTourneyHref({ slug: createSlug('Acapulco'), year: 2023 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Acapulco 2023</Link>, where he played <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Christopher Eubanks</span></span> in the first round and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Frances Tiafoe</span></span> in the second round. His final hard-court appearance total stands at <strong className="!text-amber-300">279</strong>.
          </p>

          <p>
            Behind him is <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Richard Gasquet</span></span>, with <strong className="!text-amber-300">250</strong> hard-court main draws. Gasquet ranks second in the Open Era list and remains one of the leading long-career names in ATP hard-court main-draw appearances.
          </p>

          <p>
            Third is <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Adrian Mannarino</span></span>, with <strong className="!text-amber-300">243</strong> hard-court main draws, ahead of <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Fernando Verdasco</span></span>, who ranks fourth with <strong className="!text-amber-300">235</strong>. Verdasco’s final hard-court ATP main draw came at <Link href={getTourneyHref({ slug: createSlug('Doha'), year: 2023 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Doha 2023</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Christopher O’Connell</span></span>.
          </p>

          <p>
            The next group is led by <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Gilles Simon</span></span>, with <strong className="!text-amber-300">232</strong> hard-court main draws, followed by <span className="inline-flex items-center gap-2"><Flag ioc="RUS" className="w-4 h-3" /><span>Mikhail Youzhny</span></span> with <strong className="!text-amber-300">226</strong>. Both finished inside the top six for ATP hard-court main-draw appearances in the Open Era.
          </p>

          <p>
            Then come <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Gaël Monfils</span></span> with <strong className="!text-amber-300">223</strong> and <span className="inline-flex items-center gap-2"><Flag ioc="HRV" className="w-4 h-3" /><span>Marin Cilic</span></span> with <strong className="!text-amber-300">221</strong>, two players whose totals place them just ahead of <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, ninth on the list with <strong className="!text-amber-300">220</strong> hard-court main draws. Federer’s final hard-court ATP main draw came at <Link href={getTourneyHref({ slug: createSlug('Doha'), year: 2021 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Doha 2021</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><span>Daniel Evans</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="GEO" className="w-4 h-3" /><span>Nikoloz Basilashvili</span></span>.
          </p>
        </article>
      )}

      {pathname === '/records/most-appearances-on-clay-court' && selectedSurfaces?.has('Clay') && selectedLevels?.size === 0 && (
        <article className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for most ATP main-draw appearances in clay-court tournaments stands <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Guillermo Vilas</span></span>, with <strong className="!text-amber-300">212</strong> clay-court main draws. Vilas’ last recorded ATP clay-court main draw came at <Link href={getTourneyHref({ slug: createSlug('Bordeaux'), year: 1992 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Bordeaux 1992</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>German Lopez</span></span> in the first round. His total of 212 clay main draws remains the highest mark in this category.
          
          </p>
          <p>
            Second is <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Francisco Clavet</span></span>, with <strong className="!text-amber-300">201</strong> clay-court main draws. Clavet is the only other player above 200 ATP clay main-draw appearances, and his last recorded ATP clay main draw came at <Link href={getTourneyHref({ slug: createSlug('Amersfoort'), year: 2003 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Amersfoort 2003</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Ruben Ramirez Hidalgo</span></span> in the first round.
          </p>

          <p>
            Third place is shared by <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Manuel Orantes</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Albert Montanes</span></span>, both with <strong className="!text-amber-300">192</strong> clay-court main draws. Orantes’ last ATP clay main draw came at <Link href={getTourneyHref({ slug: createSlug('Kitzbuel'), year: 1984 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Kitzbuhel 1984</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Kim Warwick</span></span> in the first round. Montañés’ final ATP tournament was <Link href={getTourneyHref({ slug: createSlug('Barcelona'), year: 2017 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Barcelona 2017</Link>; he beat <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Guillermo Garcia-Lopez</span></span> in the first round and then lost to <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Feliciano Lopez</span></span> in the second round.
          </p>

          <p>
            Fifth place is shared by <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Jordi Arrese</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" /><span>Fabio Fognini</span></span>, both with <strong className="!text-amber-300">188</strong> clay-court main draws. Arrese’s last recorded ATP clay main draw came at <Link href={getTourneyHref({ slug: createSlug('Bologna'), year: 1996 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Bologna 1996</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Carlos Costa</span></span> in the first round.
          </p>

          <p>
            Seventh is <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Javier Sanchez</span></span>, with <strong className="!text-amber-300">184</strong> clay-court main draws. His last recorded ATP clay main draw came at <Link href={getTourneyHref({ slug: createSlug('Barcelona'), year: 1999 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Barcelona 1999</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Franco Squillari</span></span> in the first round.
          </p>
        </article>
      )}

      {pathname === '/records/most-appearances-on-carpet-court' && selectedSurfaces?.has('Carpet') && selectedLevels?.size === 0 && (
        <article className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for most ATP carpet-court main-draw appearances stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>, with <strong className="!text-amber-300">126</strong> carpet main draws.             Connors leads a ranking built around the indoor-carpet era of the 1970s and 1980s, when carpet was one of the main surfaces on the ATP calendar, especially in North America and Europe. His 126 appearances are the highest total recorded in this category.
          </p>
          <p>
            Second is <span className="inline-flex items-center gap-2"><Flag ioc="ROU" className="w-4 h-3" /><span>Ilie Nastase</span></span>, with <strong className="!text-amber-300">117</strong> carpet-court main draws. Nastase belongs to the same early Open Era indoor generation as Connors, when carpet events were a major part of the tour schedule.
          </p>

          <p>
            Third is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Marty Riessen</span></span>, with <strong className="!text-amber-300">115</strong> carpet main draws, only two behind Nastase. His total places him among the most frequent ATP carpet-court participants of the Open Era.
          </p>

          <p>
            Fourth is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Brian Gottfried</span></span>, with <strong className="!text-amber-300">109</strong> carpet-court main draws. He completes the group of players above 100 appearances on the surface.
          </p>

          <p>
            The record number is <strong className="!text-amber-300">126</strong>: Jimmy Connors leads the Open Era ranking for ATP carpet-court main-draw appearances. The top four are Connors 126, Năstase 117, Riessen 115 and Gottfried 109.
          </p>
        </article>
      )}

      {pathname === '/records/most-appearances-on-grass-court' && selectedSurfaces?.has('Grass') && selectedLevels?.size === 0 && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for most ATP grass-court main-draw appearances stands <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>John Alexander</span></span>, with <strong className="!text-amber-300">95</strong> grass-court main draws. Alexander leads a ranking shaped almost entirely by the old Australian grass-court calendar. His appearances came in an era when events such as the Australian Open, Sydney, Adelaide, Brisbane and other Australian tournaments were regularly played on grass, giving Australian players far more opportunities on the surface than in the modern ATP calendar.
          </p>

          <p>
            Second is <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Phil Dent</span></span>, with <strong className="!text-amber-300">89</strong> grass-court main draws. Like Alexander, Dent built most of his total through repeated appearances in the Australian grass season, especially around the Australian Open at Kooyong and the domestic grass events of the 1970s and early 1980s.
          </p>

          <p>
            Third is <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Colin Dibley</span></span>, with <strong className="!text-amber-300">83</strong> grass-court main draws, followed by <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Syd Ball</span></span> with <strong className="!text-amber-300">80</strong> and <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Dick Crealy</span></span> with <strong className="!text-amber-300">79</strong>. Their totals reflect the same period, when grass was still a central part of the Australian circuit and not just a short pre-Wimbledon swing.
          </p>

          <p>
            The top seven is completed by <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Geoff Masters</span></span> with <strong className="!text-amber-300">75</strong> grass-court main draws and <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Ross Case</span></span> with <strong className="!text-amber-300">74</strong>. All seven players in the ranking are Australian, a direct result of the surface distribution of the early Open Era calendar.
          </p>

          <p>
            The record number is <strong className="!text-amber-300">95</strong>: John Alexander leads the Open Era ranking for ATP grass-court main-draw appearances. The top seven are Alexander 95, Dent 89, Dibley 83, Ball 80, Crealy 79, Masters 75 and Case 74.
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

      {error ? (
        <div className="text-center py-8 text-gray-300">{error}</div>
      ) : loading && !hasRows ? (
        <div className="text-center py-8 text-gray-300">Loading...</div>
      ) : hasRows ? (
        <>
          {renderTable(currentEntries, start)}

          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}

          <Modal
            show={showModal}
            onClose={() => setShowModal(false)}
            title="Players with Most Entries"
          >
            {renderTable(allEntries)}
          </Modal>
        </>
      ) : (
        <div className="text-center py-8 text-gray-300">No data available.</div>
      )}
    </section>
  );
}
