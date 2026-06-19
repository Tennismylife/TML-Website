"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import Flag from '@/components/Flag';
import { getPlayerHrefWithTab, getTourneyHref, createSlug } from "@/lib/utils";
import Pagination from '../../../components/Pagination';
import { playerTournamentsUrl, playerSurfaceHref, surfaceFromSelection } from "../nav";
import Modal from "@/components/Modal";

interface PlayerData {
  name: string;
  ioc: string;
  count: number;
  id: string;
  slug?: string | null;
}

interface TitlesProps {
  selectedSurfaces?: Set<string>;
  selectedLevels?: Set<string>;
  topTitles?: PlayerData[];
  fetchEnabled?: boolean;
  description?: string;
}

export default function Titles({ selectedSurfaces, selectedLevels, topTitles, fetchEnabled, description }: TitlesProps) {
  const [allTitles, setAllTitles] = useState<PlayerData[]>(Array.isArray(topTitles) ? topTitles : []);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const perPage = 20;
  const surfaceLink = surfaceFromSelection(selectedSurfaces);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent)?.detail;
      if (d?.resetPage) setPage(1);
    };
    window.addEventListener('records:reset', handler as EventListener);
    return () => window.removeEventListener('records:reset', handler as EventListener);
  }, []);

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels]);

  // Always fetch from client when filters change (same pattern as OldestMainDraw)
  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedSurfaces !== undefined) Array.from(selectedSurfaces).forEach(s => params.append('surface', s));
        if (selectedLevels !== undefined) Array.from(selectedLevels).forEach(l => params.append('level', l));
        params.set('perPage', showModal ? '1000' : '100');
        params.delete('page');

        const res = await fetch(`/api/records/titles?${params.toString()}`, { signal: controller.signal });
        const data = await res.json();
        const rows = Array.isArray(data.topTitles) ? data.topTitles : [];
        if (!controller.signal.aborted) setAllTitles(rows);
      } catch (err: any) {
        if (err?.name !== 'AbortError') console.error(err);
        if (!controller.signal.aborted) setAllTitles([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [selectedSurfaces, selectedLevels, showModal]);

  const totalPages = Math.ceil(allTitles.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = allTitles.slice(start, start + perPage);
  const hasRows = allTitles.length > 0;
  const showGrassNarrative =
    selectedSurfaces?.size === 1 &&
    selectedSurfaces.has('Grass') &&
    selectedLevels?.size === 0;



  const renderTable = (data: PlayerData[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Titles</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const globalRank = startIndex + idx + 1;
            return (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  <div className="flex items-center justify-center gap-2">
                    <Flag ioc={p.ioc} className="w-4 h-3" />
                    <Link href={playerSurfaceHref((p as any).slug ?? String(p.id), surfaceLink)} className="text-indigo-300 hover:underline">
                      {p.name}
                    </Link>
                  </div>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  <span className="text-indigo-300">{p.count}</span>
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

      {pathname === '/records/most-atp-titles' && selectedSurfaces?.size === 0 && selectedLevels?.size === 0 && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for most ATP singles titles won stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>, with <strong className="!text-amber-300">109</strong> tour-level titles, the highest total in men’s Open Era history. Connors was the first man to reach the 100-title milestone, doing so at <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 1983 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 1983</Link>, and his final title came at <Link href={getTourneyHref({ slug: createSlug('Tel Aviv'), year: 1989 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Tel Aviv 1989</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="ISR" className="w-4 h-3" /><span>Gilad Bloom</span></span>.

          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, with <strong className="!text-amber-300">103</strong> ATP singles titles. Federer’s first title came at <Link href={getTourneyHref({ slug: createSlug('Milan'), year: 2001 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Milan 2001</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Julien Boutter</span></span>, while his 100th title arrived at <Link href={getTourneyHref({ slug: createSlug('Dubai'), year: 2019 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Dubai 2019</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="GRE" className="w-4 h-3" /><span>Stefanos Tsitsipas</span></span>; later that same season, he won his final title at <Link href={getTourneyHref({ slug: createSlug('Basel'), year: 2019 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Basel 2019</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Alex de Minaur</span></span>.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span> is the highest active player in the chase, currently with <strong className="!text-amber-300">101</strong> ATP singles titles. His first title came at <Link href={getTourneyHref({ slug: createSlug('Amersfoort'), year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Amersfoort 2006</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="CHI" className="w-4 h-3" /><span>Nicolás Massú</span></span>; he became the third man in the Open Era to reach 100 titles at <Link href={getTourneyHref({ slug: createSlug('Geneva'), year: 2025 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Geneva 2025</Link>, and then added his 101st at <Link href={getTourneyHref({ slug: createSlug('Athens'), year: 2025 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Athens 2025</Link>, defeating <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" /><span>Lorenzo Musetti</span></span>. 
          </p>
          <p>
            Then come <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Ivan Lendl</span></span>, with <strong className="!text-amber-300">94</strong> ATP titles, and <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, with <strong className="!text-amber-300">92</strong> ATP titles. Lendl remains the only other man above the 90-title mark besides Connors, Federer, Djokovic and Nadal, while Nadal’s title story began at <Link href={getTourneyHref({ slug: createSlug('Sopot'), year: 2004 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Sopot 2004</Link> and closed with his 14th Roland Garros crown in <strong className="!text-amber-300">2022</strong>.
          </p>
          <p>
            In this record, the milestone is the trophy itself: winning one ATP title is a breakthrough, reaching 50 is a great career, reaching 90 belongs to an all-time legend, and crossing 100 has been achieved only by Connors, Federer and Djokovic.
          </p>
        </div>
      )}

      {pathname === '/records/most-grand-slam-titles' && selectedSurfaces?.size === 0 && selectedLevels?.has('G') && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the men’s list for most Grand Slam singles titles won stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, with <strong className="!text-amber-300">24</strong> majors, the all-time men’s record. Djokovic’s Grand Slam title story began at the <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2008 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 2008</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Jo-Wilfried Tsonga</span></span>, and reached its latest trophy milestone at the <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 2023 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 2023</Link>, where he beat <span className="inline-flex items-center gap-2"><Flag ioc="RUS" className="w-4 h-3" /><span>Daniil Medvedev</span></span> to move to 24. Djokovic’s total is built across all four majors: 10 Australian Opens, 3 Roland Garros titles, 7 Wimbledons and 4 US Opens.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, with <strong className="!text-amber-300">22</strong> Grand Slam titles, including the all-time record 14 Roland Garros titles. Nadal’s first major came at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2005</Link>, against <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Mariano Puerta</span></span>, and his final Grand Slam title came again in Paris at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 2022 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2022</Link>, against <span className="inline-flex items-center gap-2"><Flag ioc="NOR" className="w-4 h-3" /><span>Casper Ruud</span></span>.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span> is third with <strong className="!text-amber-300">20</strong> Grand Slam titles. His first came at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2003 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2003</Link>, against <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Mark Philippoussis</span></span>, while his last major title came at the <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2018 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 2018</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="HRV" className="w-4 h-3" /><span>Marin Cilic</span></span>. Federer’s total includes a men’s record eight <Link href={getTourneyHref({ slug: createSlug('Wimbledon') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link> titles, plus six <Link href={getTourneyHref({ slug: createSlug('Australian Open') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Opens</Link>, five <Link href={getTourneyHref({ slug: createSlug('US Open') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Opens</Link> and one <Link href={getTourneyHref({ slug: createSlug('Roland Garros') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link>.
          </p>
          <p>
            Then comes <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span>, with <strong className="!text-amber-300">14</strong> Grand Slam titles, the benchmark of the pre-Big Three era. His first major came at the <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 1990 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 1990</Link>, against <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span>, and his final title also came against Agassi at the <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 2002 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 2002</Link>.
          </p>
          <p>
            In this record, the trophy is the ultimate milestone: winning one Grand Slam defines a career, reaching double figures puts a player among the legends, and crossing 20 has been achieved only by Djokovic, Nadal and Federer. Djokovic set the ceiling at <strong className="!text-amber-300">24</strong>, Nadal pushed clay-court dominance to historic extremes, and Federer opened the modern 20-major era that changed the scale of greatness in men’s tennis.
          </p>
        </div>
      )}

      {pathname === '/records/most-masters-1000-titles' && selectedSurfaces?.size === 0 && selectedLevels?.has('M') && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the ATP Masters 1000 list for most titles won stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, with a record <strong className="!text-amber-300">40</strong> Masters 1000 titles since the series began in 1990. His first title at this level came at <Link href={getTourneyHref({ slug: createSlug('Miami Masters'), year: 2007 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 2007</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Guillermo Cañas</span></span>, while his 40th and most recent Masters 1000 title came at <Link href={getTourneyHref({ slug: createSlug('Paris Masters'), year: 2023 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Paris 2023</Link>, where he beat <span className="inline-flex items-center gap-2"><Flag ioc="BUL" className="w-4 h-3" /><span>Grigor Dimitrov</span></span> to become the first player ever to reach the 40-title milestone.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, with <strong className="!text-amber-300">36</strong> Masters 1000 titles. Nadal’s first came at <Link href={getTourneyHref({ slug: createSlug('Monte Carlo Masters'), year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo 2005</Link>, against <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Guillermo Coria</span></span>, opening a clay-court dynasty that would include a record 11 Monte-Carlo titles and 10 <Link href={getTourneyHref({ slug: createSlug('Rome Masters') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome</Link> titles; his final Masters 1000 title came at <Link href={getTourneyHref({ slug: createSlug('Rome Masters'), year: 2021 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome 2021</Link>, again against Djokovic.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span> is third with <strong className="!text-amber-300">28</strong> Masters 1000 titles. His first came at <Link href={getTourneyHref({ slug: createSlug('Hamburg Masters'), year: 2002 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Hamburg 2002</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="RUS" className="w-4 h-3" /><span>Marat Safin</span></span>, while his last came at <Link href={getTourneyHref({ slug: createSlug('Miami Masters'), year: 2019 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 2019</Link>, against <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John Isner</span></span>.
          </p>
          <p>
            Then come <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span>, with <strong className="!text-amber-300">17</strong> Masters 1000 titles, <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><span>Andy Murray</span></span>, with <strong className="!text-amber-300">14</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span>, with <strong className="!text-amber-300">11</strong>. Agassi’s first Masters 1000 title came at <Link href={getTourneyHref({ slug: createSlug('Miami Masters'), year: 1990 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 1990</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Stefan Edberg</span></span>; Murray’s first came at <Link href={getTourneyHref({ slug: createSlug('Cincinnati Masters'), year: 2008 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Cincinnati 2008</Link> against Djokovic; and Sampras’ first came at <Link href={getTourneyHref({ slug: createSlug('Cincinnati Masters'), year: 1992 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Cincinnati 1992</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Ivan Lendl</span></span>.
          </p>
          <p>
            In this record, the title itself is the milestone: winning one Masters 1000 means conquering the highest regular-season level of the ATP Tour; reaching double figures already marks an all-time career, while only Djokovic, Nadal and Federer have gone beyond 25. Djokovic set the ceiling at <strong className="!text-amber-300">40</strong>, Nadal built the great clay-Masters record, and Federer remains the benchmark of all-surface consistency across the first two decades of the modern Masters era.
          </p>
        </div>
      )}

      {pathname === '/records/most-masters-1000-titles-in-a-single-season' && selectedSurfaces?.size === 0 && selectedLevels?.has('M') && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the list stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, whose 2015 season produced the greatest Masters 1000 title haul in ATP history.
          </p>
          <p>
            Djokovic won 6 Masters 1000 titles that year — Indian Wells, Miami, Monte Carlo, Rome, Shanghai and Paris — becoming the only man to win six tournaments of this category in a single season.
          </p>
          <p>
            What makes Djokovic’s 2015 record so difficult to match is the structure of the Masters calendar itself. There are only nine Masters 1000 events in a season, spread across hard courts and clay, across North America, Europe and Asia. Winning six of them means controlling two thirds of the entire elite best-of-three calendar.
          </p>
          <p>
            Djokovic did not simply dominate one part of the season: he won the Sunshine Double at Indian Wells and Miami, added clay-court titles in Monte Carlo and Rome, then finished the Masters year with Shanghai and Paris.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span> had already set the previous benchmark in 2011, when he won 5 Masters 1000 titles: Indian Wells, Miami, Madrid, Rome and Montreal. ATP’s 2011 results archive lists Djokovic as champion at all five events, while Guinness notes that his 2011 Masters run included a 31-match winning streak at that level.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> matched the five-title mark in 2013. Nadal won Indian Wells, Madrid, Rome, Montreal and Cincinnati, producing one of the most complete Masters seasons ever played across both clay and hard courts.
          </p>
          <p>
            Behind the five-title seasons sits a group of four-title campaigns. <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span> reached 4 Masters 1000 titles in both 2005 and 2006, while <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> also won 4 in 2005.
          </p>
          <p>
            That is why Djokovic’s 2015 record still stands apart. Six Masters 1000 titles in one season is not just a measure of peak level; it is a measure of sustained control across the most demanding regular-tour events in men’s tennis. Nadal and Djokovic reached five, Federer repeatedly reached four, but Djokovic’s 2015 season remains the only one to break through that ceiling — the year in which one player turned the Masters 1000 circuit into his own territory.
          </p>
        </div>
      )}

      {pathname === '/records/most-titles-won-on-hard-court' && selectedSurfaces?.has('Hard') && selectedLevels?.size === 0 && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for most ATP titles won on hard courts stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, with a record <strong className="!text-amber-300">72</strong> hard-court titles.  He moved past Roger Federer at the Hellenic Championship in <Link href={getTourneyHref({ slug: createSlug('Athens'), year: 2025 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Athens 2025</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" /><span>Lorenzo Musetti</span></span> to win his <strong className="!text-amber-300">101st</strong> ATP title and his record-breaking 72nd title on hard courts. Djokovic’s first hard-court title had come almost two decades earlier at <Link href={getTourneyHref({ slug: createSlug('Metz'), year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Metz 2006</Link>, where he beat <span className="inline-flex items-center gap-2"><Flag ioc="AUT" className="w-4 h-3" /><span>Jürgen Melzer</span></span> in the final.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, who finished with <strong className="!text-amber-300">71</strong> hard-court titles out of his 103 career ATP singles titles. Federer’s hard-court title story began in <strong className="!text-amber-300">2002</strong>, with early wins such as <Link href={getTourneyHref({ slug: createSlug('Sydney'), year: 2002 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Sydney 2002</Link>, and ended at <Link href={getTourneyHref({ slug: createSlug('Basel'), year: 2019 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Basel 2019</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Alex de Minaur</span></span> for the final title of his career.
          </p>
          <p>
            Then come the great American hard-court champions of previous eras: <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span>, with <strong className="!text-amber-300">46</strong> hard-court titles, and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>, with <strong className="!text-amber-300">43</strong> according to the ATP surface classification. Agassi’s total includes his long dominance across events such as the Australian Open, US Open, Miami, Cincinnati, Canada, Los Angeles and Washington. Connors’ hard-court total is especially notable because his career was also heavily split across carpet, grass and clay, yet he still collected more than 40 ATP-listed titles on hard courts.
          </p>
          <p>
            Behind them stand <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span> with <strong className="!text-amber-300">36</strong> hard-court titles, <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><span>Andy Murray</span></span> with <strong className="!text-amber-300">34</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Ivan Lendl</span></span> with <strong className="!text-amber-300">31</strong>. <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> reached <strong className="!text-amber-300">25</strong> hard-court titles, from his first at the <Link href={getTourneyHref({ slug: createSlug('Canada Masters'), year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Canada Masters 2005</Link> to his last at <Link href={getTourneyHref({ slug: createSlug('Acapulco'), year: 2022 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Acapulco 2022</Link>.
          </p>
          <p>
            In this record, the milestone is the trophy itself: hard courts dominate the modern calendar, so winning repeatedly on this surface means succeeding across Australia, North America, Asia, indoor Europe and the year-end stage. Djokovic now owns the ceiling at <strong className="!text-amber-300">72</strong>, Federer set the previous benchmark at <strong className="!text-amber-300">71</strong>, and Agassi remains the only other man to have passed the 45-title mark on hard courts.
          </p>
        </div>
      )}

      {pathname === '/records/most-titles-won-on-clay' && selectedSurfaces?.has('Clay') && selectedLevels?.size === 0 && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for most ATP titles won on clay stands <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, with a record <strong className="!text-amber-300">63</strong> clay-court titles. His clay-title story began at <Link href={getTourneyHref({ slug: createSlug('Sopot'), year: 2004 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Sopot 2004</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>José Acasuso</span></span> for his first ATP title, and reached its final trophy milestone at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 2022 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2022</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="NOR" className="w-4 h-3" /><span>Casper Ruud</span></span> to win his 14th French Open and his 63rd clay-court title. Nadal’s clay dominance is concentrated around four historic strongholds: <Link href={getTourneyHref({ slug: createSlug('Roland Garros') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> with 14 titles, <Link href={getTourneyHref({ slug: createSlug('Barcelona') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Barcelona</Link> with 12, <Link href={getTourneyHref({ slug: createSlug('Monte Carlo') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo</Link> with 11 and <Link href={getTourneyHref({ slug: createSlug('Rome Masters') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome</Link> with 10.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Guillermo Vilas</span></span>, the previous record-holder, with <strong className="!text-amber-300">49</strong> clay-court titles won between <strong className="!text-amber-300">1973</strong> and <strong className="!text-amber-300">1983</strong>. Nadal equalled Vilas at <Link href={getTourneyHref({ slug: createSlug('Barcelona'), year: 2016 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Barcelona 2016</Link> by defeating <span className="inline-flex items-center gap-2"><Flag ioc="JPN" className="w-4 h-3" /><span>Kei Nishikori</span></span>, then passed him at <Link href={getTourneyHref({ slug: createSlug('Monte Carlo Masters'), year: 2017 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo 2017</Link>, when he reached the 50-title milestone on clay.
          </p>
          <p>
            Then comes <span className="inline-flex items-center gap-2"><Flag ioc="AUT" className="w-4 h-3" /><span>Thomas Muster</span></span>, with <strong className="!text-amber-300">40</strong> titles on clay, including <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 1995 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 1995</Link> and a peak season in which he won 11 tournaments in 1995, most of them on red dirt. Behind Muster are <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Björn Borg</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Manuel Orantes</span></span>, listed at <strong className="!text-amber-300">32</strong> and <strong className="!text-amber-300">31</strong> clay-court titles, respectively: Borg’s clay-title path ran from the <Link href={getTourneyHref({ slug: createSlug('Rome Masters'), year: 1974 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1974 Italian Open</Link> to <Link href={getTourneyHref({ slug: createSlug('Geneva'), year: 1981 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Geneva 1981</Link>, while Orantes’ stretched from <Link href={getTourneyHref({ slug: createSlug('Barcelona'), year: 1969 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Barcelona 1969</Link> to <Link href={getTourneyHref({ slug: createSlug('Bournemouth'), year: 1982 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Bournemouth 1982</Link>.
          </p>
          <p>
            The next historical group includes <span className="inline-flex items-center gap-2"><Flag ioc="ROU" className="w-4 h-3" /><span>Ilie Năstase</span></span> with <strong className="!text-amber-300">31</strong> clay titles, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Ivan Lendl</span></span> with <strong className="!text-amber-300">28</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>José Luis Clerc</span></span> with <strong className="!text-amber-300">21</strong>, and then <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Mats Wilander</span></span> with <strong className="!text-amber-300">20</strong> each.
          </p>
          <p>
            In this record, the milestone is the trophy itself: winning repeatedly on clay means surviving the most physical surface in tennis, year after year. Nadal pushed the ceiling to <strong className="!text-amber-300">63</strong>, Vilas set the old Open Era benchmark at <strong className="!text-amber-300">49</strong>, and Muster remains the only other man to reach the <strong className="!text-amber-300">40</strong>-title mark on clay.
          </p>
        </div>
      )}

      {showGrassNarrative && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for most ATP titles won on grass stands <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, with a record <strong className="!text-amber-300">19</strong> grass-court singles titles, far ahead of every other man in the Open Era. His first title on the surface came at <Link href={getTourneyHref({ slug: createSlug('Halle'), year: 2003 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Halle 2003</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Nicolas Kiefer</span></span> 6-1, 6-3, while his final grass-court title also came at <Link href={getTourneyHref({ slug: createSlug('Halle'), year: 2019 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Halle 2019</Link>, against <span className="inline-flex items-center gap-2"><Flag ioc="BEL" className="w-4 h-3" /><span>David Goffin</span></span>, giving him a record 10 titles at the same grass-court event. Federer’s total is built around two historic strongholds: <Link href={getTourneyHref({ slug: createSlug('Wimbledon') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link>, where he won a men’s record eight titles, and <Link href={getTourneyHref({ slug: createSlug('Halle') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Halle</Link>, where he won 10, plus one further grass title at <Link href={getTourneyHref({ slug: createSlug('Stuttgart'), year: 2018 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Stuttgart 2018</Link>.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span>, with <strong className="!text-amber-300">10</strong> grass-court titles: his first came at <Link href={getTourneyHref({ slug: createSlug('Manchester'), year: 1990 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Manchester 1990</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="ISR" className="w-4 h-3" /><span>Gilad Bloom</span></span>, and his grass legacy was defined above all by seven <Link href={getTourneyHref({ slug: createSlug('Wimbledon') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link> titles and two further titles at <Link href={getTourneyHref({ slug: createSlug('Queen’s Club') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Queen’s Club</Link>.
          </p>
          <p>
            Then come <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Rod Laver</span></span>, both with nine grass-court titles. Connors’ grass titles included the <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 1974 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 1974</Link>, <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 1974 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 1974</Link> and <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 1982 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 1982</Link>, the grass-era <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 1974 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 1974</Link>, three titles at <Link href={getTourneyHref({ slug: createSlug('Queen’s Club') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Queen’s Club</Link>, plus <Link href={getTourneyHref({ slug: createSlug('Manchester') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Manchester</Link> and <Link href={getTourneyHref({ slug: createSlug('Birmingham') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Birmingham</Link>; Laver’s biggest grass milestone was <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 1969 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 1969</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>John Newcombe</span></span> in a four-set final.
          </p>
          <p>
            A large group follows on eight grass titles, including <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><span>Andy Murray</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Lleyton Hewitt</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John McEnroe</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="RUS" className="w-4 h-3" /><span>Alex Metreveli</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Ken Rosewall</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Lleyton Hewitt</span></span>.
          </p>
          <p>
            In this record, the trophy itself is the milestone: grass offers the shortest season in tennis, so winning repeatedly on the surface requires timing, adaptation and peak execution. Federer set the ceiling at <strong className="!text-amber-300">19</strong>, Sampras is the only other man to reach double figures, and Djokovic remains the leading modern active name in the historical grass-title group.
          </p>
        </div>
      )}

      {pathname === '/records/most-titles-won-on-carpet' && selectedSurfaces?.has('Carpet') && selectedLevels?.size === 0 && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for most ATP titles won on carpet stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>, with <strong className="!text-amber-300">45</strong> carpet-court singles titles, the highest total recorded on the surface. His first carpet title came at <Link href={getTourneyHref({ slug: createSlug('Roanoke'), year: 1972 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roanoke 1972</Link>, an indoor-carpet event played from 21 to 23 January 1972, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Vladimír Zedník</span></span> 6-4, 7-6 in the final. His last carpet title came at <Link href={getTourneyHref({ slug: createSlug('Toulouse'), year: 1989 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Toulouse 1989</Link>, played on indoor carpet from 9 to 15 October 1989, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John McEnroe</span></span> 6-3, 6-3; it was his 108th career title, one before his final ATP title at <Link href={getTourneyHref({ slug: createSlug('Tel Aviv'), year: 1989 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Tel Aviv 1989</Link>.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John McEnroe</span></span>, with <strong className="!text-amber-300">43</strong> titles on carpet, more than half of his 77 career singles titles. His first carpet title came at <Link href={getTourneyHref({ slug: createSlug('Hartford WCT'), year: 1978 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Hartford WCT 1978</Link>, where he beat <span className="inline-flex items-center gap-2"><Flag ioc="RSA" className="w-4 h-3" /><span>Johan Kriek</span></span> 6-2, 6-4 in the final. His last carpet title came at <Link href={getTourneyHref({ slug: createSlug('Chicago'), year: 1991 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Chicago 1991</Link>, in a family final against his brother <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Patrick McEnroe</span></span>, won 3-6, 6-2, 6-4; it was also John McEnroe’s 77th and final ATP singles title.
          </p>
          <p>
            Third is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Ivan Lendl</span></span>, with <strong className="!text-amber-300">33</strong> carpet titles. His first carpet title was at <Link href={getTourneyHref({ slug: createSlug('Basel'), year: 1980 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Basel 1980</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Björn Borg</span></span> 6-3, 6-2, 5-7, 0-6, 6-4. His last carpet title came at <Link href={getTourneyHref({ slug: createSlug('Tokyo Indoor'), year: 1993 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Tokyo Indoor 1993</Link>, where he beat <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Todd Martin</span></span> 6-4, 6-4 in the final.
          </p>
          <p>
            Then comes <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Boris Becker</span></span>, with <strong className="!text-amber-300">26</strong> carpet titles, the surface that best reflected his indoor power game. Becker finished his career with 49 ATP singles titles, and his biggest carpet peaks included the <Link href={getTourneyHref({ slug: createSlug('ATP Finals') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">ATP Finals</Link> and the major indoor events of the late 1980s and 1990s.
          </p>
          <p>
            A second historical group follows with players such as <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Arthur Ashe</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Rod Laver</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="ROU" className="w-4 h-3" /><span>Ilie Năstase</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Stan Smith</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Stefan Edberg</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span>, all heavily linked to the indoor-carpet era, before the surface disappeared from regular top-level ATP use.
          </p>
          <p>
            In this record, the key point is that carpet is now a closed chapter: unlike hard, clay or grass, these totals are effectively frozen. Connors set the ceiling at <strong className="!text-amber-300">45</strong>, McEnroe stopped just behind him at <strong className="!text-amber-300">43</strong>, and Lendl remains the only other man above 30 carpet titles.
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

      {loading && !hasRows ? (
        <div className="text-center py-8 text-gray-300">Loading...</div>
      ) : hasRows ? (
        renderTable(currentData, start)
      ) : (
        <div className="text-center py-8 text-gray-300">No data available.</div>
      )}

      {totalPages > 1 && !showModal && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title="Players with Most Titles"
      >
        {renderTable(allTitles)}
      </Modal>
    </section>
  );
}
