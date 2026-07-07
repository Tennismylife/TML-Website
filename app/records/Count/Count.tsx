"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import Flag from '@/components/Flag';
import { createSlug, getPlayerHrefWithTab, getTourneyHref } from '@/lib/utils';
import { playerTournamentsUrl, playerSurfaceHref, surfaceFromSelection } from '../nav';
import Pagination from '../../../components/Pagination';
import Modal from "@/components/Modal";

interface PlayerData {
  name: string;
  ioc: string;
  count: number;
  id: string;
  slug?: string | null;
}

interface CountProps {
  selectedRounds?: string;
  selectedSurfaces?: Set<string>;
  selectedLevels?: Set<string>;
  selectedBestOf?: number | null;
  topCount?: PlayerData[];
  fetchEnabled?: boolean;
  description?: string;
  canonicalUrl?: string;
}

export default function Count({ selectedRounds, selectedSurfaces, selectedLevels, selectedBestOf, topCount, fetchEnabled, description, canonicalUrl }: CountProps) {
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>(Array.isArray(topCount) ? topCount : []);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const pathname = usePathname();
  // Derive the narrative path from the canonical URL prop (same on server and client)
  // to avoid hydration mismatches caused by usePathname() differing between SSR and client.
  const narrativePath = canonicalUrl
    ? (() => { try { return new URL(canonicalUrl).pathname; } catch { return canonicalUrl; } })()
    : pathname;
  const searchParams = useSearchParams();
  const perPage = 20;
  const surfaceLink = surfaceFromSelection(selectedSurfaces);
  const djokovicGrandSlamSemifinals = Math.max(
    allPlayers.find(
      (p) => p.id === 'D643' || p.slug === 'novak-djokovic' || p.name === 'Novak Djokovic'
    )?.count ?? 0,
    55,
  );
  useEffect(() => {
    const handler = (e: Event) => { if ((e as CustomEvent)?.detail?.resetPage) setPage(1); };
    window.addEventListener('records:reset', handler as EventListener);
    return () => window.removeEventListener('records:reset', handler as EventListener);
  }, []);

  // Reset page when filters change
  useEffect(() => setPage(1), [searchParams]);

  // Always fetch from client when filters change (same pattern as OldestMainDraw)
  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        setError(null);
        const params = new URLSearchParams();
        if (selectedSurfaces !== undefined) Array.from(selectedSurfaces).forEach(s => params.append('surface', s));
        if (selectedLevels !== undefined) Array.from(selectedLevels).forEach(l => params.append('level', l));
        if (selectedRounds) params.set('round', selectedRounds);
        if (selectedBestOf != null) params.set('bestOf', String(selectedBestOf));
        params.set('perPage', showModal ? '1000' : '100');
        params.delete('page');

        const res = await fetch(`/api/records/count?${params.toString()}`, { signal: controller.signal });
        const data = await res.json();
        const rows = Array.isArray(data.top) ? data.top : [];
        if (!controller.signal.aborted) setAllPlayers(rows);
      } catch (err: any) {
        if (err?.name !== 'AbortError') console.error(err);
        if (!controller.signal.aborted) {
          setAllPlayers([]);
          setError('Error loading data');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, showModal]);

  const hasRows = allPlayers.length > 0;
  const totalPages = loading || !allPlayers.length ? 0 : Math.ceil(allPlayers.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = loading || !allPlayers.length ? [] : allPlayers.slice(start, start + perPage);





  const renderTable = (data: PlayerData[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Appearances</th>
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
                    <Flag ioc={p.ioc} className="w-4 h-3 inline-block" />
                    <Link href={playerSurfaceHref((p as any).slug ?? String(p.id), surfaceLink)} className="text-indigo-300 hover:underline">
                      {p.name}
                    </Link>
                  </div>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  <Link href={playerTournamentsUrl((p as any).slug ?? String(p.id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="text-indigo-300 hover:underline">
                    {p.count}
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

      {!loading && allPlayers.length > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            View All
          </button>
        </div>
      )}

      {narrativePath === '/records/most-finals-reached' && selectedRounds === 'F' && (!selectedSurfaces || selectedSurfaces.size === 0) && (!selectedLevels || selectedLevels.size === 0) && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for most ATP singles finals reached stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>, with <strong className="!text-amber-300">165</strong> career finals, the highest total ever recorded on the men’s tour. Connors reached his first finals in 1971 at Columbus against <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Tom Gorman</span></span> and at Los Angeles against <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pancho Gonzales</span></span>, before closing his finals record with his 165th final at <Link href={getTourneyHref({ slug: createSlug('Tel Aviv'), year: 1989 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Tel Aviv 1989</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="ISR" className="w-4 h-3" /><span>Gilad Bloom</span></span>.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, who finished with <strong className="!text-amber-300">157</strong> ATP singles finals, from his first final at <Link href={getTourneyHref({ slug: createSlug('Marseille'), year: 2000 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Marseille 2000</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Marc Rosset</span></span> to his last one at <Link href={getTourneyHref({ slug: createSlug('Basel'), year: 2019 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Basel 2019</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Alex de Minaur</span></span>.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Ivan Lendl</span></span> is third with <strong className="!text-amber-300">145</strong> finals reached: his first came at <Link href={getTourneyHref({ slug: createSlug('Brussels'), year: 1979 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Brussels 1979</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="HUN" className="w-4 h-3" /><span>Balázs Taróczy</span></span>, while his last title match came at <Link href={getTourneyHref({ slug: createSlug('Sydney'), year: 1994 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Sydney 1994</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span>.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span> is the highest active player in the chase, currently listed at <strong className="!text-amber-300">144</strong> ATP finals; his first final came at <Link href={getTourneyHref({ slug: createSlug('Amersfoort'), year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Amersfoort 2006</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="CHI" className="w-4 h-3" /><span>Nicolás Massú</span></span>, and every new final still changes his position in the historical race.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> completes the top group with <strong className="!text-amber-300">131</strong> ATP singles finals, a run that began at <Link href={getTourneyHref({ slug: createSlug('Auckland'), year: 2004 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Auckland 2004</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="SVK" className="w-4 h-3" /><span>Dominik Hrbatý</span></span> and ended at <Link href={getTourneyHref({ slug: createSlug('Bastad'), year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Båstad 2024</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="POR" className="w-4 h-3" /><span>Nuno Borges</span></span>.
          </p>
          <p>
            In this record, the milestone is not only the number of titles won, but the repeated ability to survive an entire draw and reach the final Sunday: Connors set the ceiling at <strong className="!text-amber-300">165</strong>, Federer came closest at <strong className="!text-amber-300">157</strong>, and Djokovic remains the only player still able to add to his total.
          </p>
        </div>
      )}

      {narrativePath === '/records/most-grand-slam-semifinals-reached' && selectedRounds === 'SF' && selectedLevels?.has('G') && (!selectedSurfaces || selectedSurfaces.size === 0) && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the men’s Grand Slam “most semifinals reached” list stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, with <strong className="!text-amber-300">{djokovicGrandSlamSemifinals}</strong> Grand Slam singles semifinals reached, the highest total in men’s tennis.
          </p>
          <p>
            His first major semifinal came at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 2007 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2007</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>; he later tied Roger Federer’s record with his 46th Grand Slam semifinal at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2023 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2023</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="RUS" className="w-4 h-3" /><span>Andrey Rublev</span></span>, then moved beyond Federer at the <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 2023 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 2023</Link>. After reaching his 54th major semifinal at the <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2026 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 2026</Link>, Djokovic pushed the record to a 55th at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2026 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2026</Link> by defeating <span className="inline-flex items-center gap-2"><Flag ioc="CAN" className="w-4 h-3" /><span>Felix Auger-Aliassime</span></span> in the quarter-finals.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, who finished with <strong className="!text-amber-300">46</strong> Grand Slam semifinals. His first came at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2003 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2003</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andy Roddick</span></span> in the semifinal on the way to his first major title; his last came at the <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2020 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 2020</Link>, again against Djokovic, in what became their 50th and final professional meeting.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> is third with <strong className="!text-amber-300">38</strong> Grand Slam semifinals reached. His first came at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2005</Link>, where he beat Federer in the semifinals before winning his first major title; his last semifinal run came at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2022 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2022</Link>, where he reached the last four after defeating <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Taylor Fritz</span></span>, but withdrew before facing <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Nick Kyrgios</span></span> because of an abdominal tear.
          </p>
          <p>
            Then come <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>, with <strong className="!text-amber-300">31</strong> Grand Slam semifinals, and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Ivan Lendl</span></span>, with <strong className="!text-amber-300">28</strong>. Connors’ last great major semifinal run came at the <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 1991 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 1991</Link>, where he reached the last four at age 39 before facing <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jim Courier</span></span>; Lendl’s final major semifinal appearance also came at the <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 1991 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 1991</Link>, where his run ended against <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Stefan Edberg</span></span>.
          </p>
          <p>
            In this record, the semifinal is the ultimate consistency marker: reaching the last four of a Grand Slam once means a great tournament, doing it more than 30 times means an entire career spent deep in the biggest draws. Djokovic pushed the ceiling beyond 50, Federer set the previous modern benchmark at 46, and Nadal remains the only other man to pass 35.
          </p>
        </div>
      )}

      {narrativePath === '/records/most-grand-slam-finals-reached' && selectedRounds === 'F' && selectedLevels?.has('G') && (!selectedSurfaces || selectedSurfaces.size === 0) && selectedBestOf == null && (
        <article className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the all-time men’s list for most Grand Slam singles finals reached stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, with <strong className="!text-amber-300">38</strong> major finals, the highest total ever recorded in men’s tennis.
          </p>
          <p>
            Djokovic’s first Grand Slam final came at <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 2007 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 2007</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span> in New York. From that first breakthrough, he built the longest and most complete Grand Slam finals résumé in the sport: finals at every major, multiple title matches across three different decades, and a record total that now sets him apart from every other player. His latest Grand Slam final marker came at <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2026 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 2026</Link>, extending his lead at the top of this category.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, with <strong className="!text-amber-300">31</strong> Grand Slam finals reached, the second-highest total in men’s tennis history. Federer’s first major final came at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2003 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2003</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Mark Philippoussis</span></span> to win his first Grand Slam title. His final Grand Slam final appearance also came at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2019 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2019</Link>, against Djokovic, closing a span of sixteen years spent regularly competing on the sport’s biggest stages.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> follows with <strong className="!text-amber-300">30</strong> Grand Slam finals reached, a total built around one of the most dominant major-tournament profiles ever seen. His first Grand Slam final came at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2005</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Mariano Puerta</span></span> to begin his historic reign in Paris. His final major final came at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 2022 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2022</Link>, when he defeated <span className="inline-flex items-center gap-2"><Flag ioc="NOR" className="w-4 h-3" /><span>Casper Ruud</span></span> to claim his 14th French Open title and 22nd Grand Slam crown.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Ivan Lendl</span></span> completes the next historical tier with <strong className="!text-amber-300">19</strong> Grand Slam finals reached. His first major final came at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 1981 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 1981</Link>, against <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Björn Borg</span></span>, while his final Grand Slam title-match appearance came at <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 1991 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 1991</Link>, against <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Boris Becker</span></span>. Lendl’s total remains one of the great benchmarks of Open Era consistency, especially across the 1980s.
          </p>
          <p>
            Just behind him is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span>, with <strong className="!text-amber-300">18</strong> Grand Slam finals reached. Sampras began and ended his major-final story against the same opponent: <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span>. His first Grand Slam final came at <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 1990 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 1990</Link>, where he defeated Agassi to win his first major title; his last came at <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 2002 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 2002</Link>, again against Agassi, in what became the final match of his professional career.
          </p>
          <p>
            In this record, reaching a Grand Slam final represents the ultimate durability checkpoint. Winning a major defines a peak; returning to major finals again and again defines an era. Djokovic has pushed the ceiling to 38, Federer stands next at 31, Nadal follows at 30, while Lendl and Sampras remain the great historical reference points behind the Big Three.
          </p>
        </article>
      )}

      {narrativePath === '/records/most-semifinals-reached' && selectedRounds === 'SF' && (!selectedSurfaces || selectedSurfaces.size === 0) && (!selectedLevels || selectedLevels.size === 0) && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for most ATP singles semi-finals reached stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>, with <strong className="!text-amber-300">239</strong> career semi-finals, the highest total recorded in men’s tour-level tennis. His first known ATP semi-final run came at <Link href={getTourneyHref({ slug: createSlug('Columbus'), year: 1971 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Columbus 1971</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Erik van Dillen</span></span> in the last four before reaching the final against <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Tom Gorman</span></span>.
          </p>
          <p>
            Behind him, <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, <strong className="!text-amber-300">211</strong>, turned semi-final appearances into one of the clearest measures of his consistency: one of his earliest milestones came at <Link href={getTourneyHref({ slug: createSlug('Vienna'), year: 1999 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Vienna 1999</Link>, his first ATP semi-final, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><span>Greg Rusedski</span></span>.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span> is the leading active name in the chase: his first ATP title run at <Link href={getTourneyHref({ slug: createSlug('Amersfoort'), year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Amersfoort 2006</Link> included a semi-final against <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Guillermo Coria</span></span>, while his career has since produced record-level semi-final numbers at the biggest events, including the ATP Masters 1000.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Ivan Lendl</span></span> has <strong className="!text-amber-300">189</strong>, building his semi-final volume through the late 1970s, 1980s and early 1990s; his early breakthrough included <Link href={getTourneyHref({ slug: createSlug('Brussels'), year: 1979 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Brussels 1979</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Tomáš Šmíd</span></span> in the semi-finals before facing <span className="inline-flex items-center gap-2"><Flag ioc="HUN" className="w-4 h-3" /><span>Balázs Taróczy</span></span> in the final.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> with <strong className="!text-amber-300">178</strong> also belongs to the same historical group: his first ATP final run came at <Link href={getTourneyHref({ slug: createSlug('Auckland'), year: 2004 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Auckland 2004</Link>, where his semi-final path led him to a title match against <span className="inline-flex items-center gap-2"><Flag ioc="SVK" className="w-4 h-3" /><span>Dominik Hrbatý</span></span>, and his career later became one of the strongest examples of repeated last-four appearances across clay, hard courts and majors.
          </p>
          <p>
            In this record, the semi-final is the real milestone: it means surviving almost the entire draw, again and again, across seasons, surfaces and generations of opponents.
          </p>
        </div>
      )}

      {narrativePath === '/records/most-quarterfinals-reached' && selectedRounds === 'QF' && (!selectedSurfaces || selectedSurfaces.size === 0) && (!selectedLevels || selectedLevels.size === 0) && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for most ATP singles quarter-finals reached stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>, with <strong className="!text-amber-300">276</strong> career quarter-finals, the highest total recorded at tour level.
          </p>
          <p>
            Connors began building this record as early as <Link href={getTourneyHref({ slug: createSlug('Haverford'), year: 1970 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Haverford 1970</Link>, where he reached the last sixteen after victories over <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Jean-Baptiste Chanfreau</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Allan Stone</span></span>, before falling to <span className="inline-flex items-center gap-2"><Flag ioc="PAK" className="w-4 h-3" /><span>Haroon Rahim</span></span>. His final major quarter-final marker came much later, at <Link href={getTourneyHref({ slug: createSlug('Halle'), year: 1995 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Halle 1995</Link>, when, at the age of 42, he reached the last eight before facing <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Marc Rosset</span></span>.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, with <strong className="!text-amber-300">245</strong> ATP quarter-finals reached, the second-highest total in the Open Era. Federer’s first ATP quarter-final came at <Link href={getTourneyHref({ slug: createSlug('Toulouse'), year: 1998 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Toulouse 1998</Link>, where the 17-year-old Swiss qualifier reached the last eight after defeating <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Guillaume Raoux</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Richard Fromberg</span></span>, before facing <span className="inline-flex items-center gap-2"><Flag ioc="NLD" className="w-4 h-3" /><span>Jan Siemerink</span></span>. His final quarter-final appearance came at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2021 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2021</Link>, against <span className="inline-flex items-center gap-2"><Flag ioc="POL" className="w-4 h-3" /><span>Hubert Hurkacz</span></span>, in what would become the last singles match of his career.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> follows with <strong className="!text-amber-300">226</strong> ATP quarter-finals reached, a total built across more than two decades and on every surface. One of his earliest quarter-final milestones came at <Link href={getTourneyHref({ slug: createSlug('Auckland'), year: 2004 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Auckland 2004</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Grégory Carraz</span></span> on his way to a first ATP final. His final quarter-final run came at <Link href={getTourneyHref({ slug: createSlug('Bastad'), year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Båstad 2024</Link>, where he reached the last eight after defeating <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><span>Cameron Norrie</span></span>, before facing <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Mariano Navone</span></span>.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span> remains the active player still moving within this record. He first reached an ATP quarter-final at <Link href={getTourneyHref({ slug: createSlug('Zagreb'), year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Zagreb 2006</Link>, where he defeated compatriot <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Ilija Bozoljac</span></span>.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Ivan Lendl</span></span> completes the historical top group with <strong className="!text-amber-300">217</strong> ATP quarter-finals reached, the same total Djokovic had matched at the start of 2025 before moving ahead. His first quarter-final was played against <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Eric Deblicker</span></span> at <Link href={getTourneyHref({ slug: createSlug('Aix-en-Provence'), year: 1978 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Aix-en-Provence 1978</Link>. One of his final quarter-final appearances came at <Link href={getTourneyHref({ slug: createSlug('Coral Springs'), year: 1994 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Coral Springs 1994</Link>, against <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Mark Woodforde</span></span>.
          </p>
          <p>
            In this record, the quarter-final represents the first true durability checkpoint. Reaching the last eight once shows form; doing it more than 200 times reflects a career spent consistently going deep in tour-level draws. Connors set the ceiling at 276, Federer came closest with 245, while Djokovic remains the only active player still capable of climbing further.
          </p>
        </div>
      )}

      {narrativePath === '/records/most-grand-slam-quarterfinals-reached' && selectedRounds === 'QF' && selectedLevels?.has('G') && (!selectedSurfaces || selectedSurfaces.size === 0) && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the men’s Grand Slam “most quarter-finals reached” list stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, {djokovicGrandSlamQuarterfinals != null ? <>with <strong className="!text-amber-300">{djokovicGrandSlamQuarterfinals}</strong> Grand Slam quarter-finals or better, the highest total in men’s tennis when counting every major run that reached at least the last eight.</> : <>owner of the highest Grand Slam quarter-final total in men’s tennis when counting every major run that reached at least the last eight.</>}
          </p>
          <p>
            His first Grand Slam quarter-final came at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2006</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> in what became the first chapter of their rivalry. Djokovic first tied Roger Federer’s Open Era record at the <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 2024</Link> by reaching his 58th major quarter-final, then broke it at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2024</Link> after defeating <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Francisco Cerundolo</span></span>, and reached the 60-quarter-final milestone a few weeks later at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2024</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="DNK" className="w-4 h-3" /><span>Holger Rune</span></span>.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, who finished with <strong className="!text-amber-300">58</strong> Grand Slam quarter-finals; his first came at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2001 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2001</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><span>Tim Henman</span></span> after his famous fourth-round win over Pete Sampras, while his last came at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2021 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2021</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="POL" className="w-4 h-3" /><span>Hubert Hurkacz</span></span>.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> follows with <strong className="!text-amber-300">47</strong> major quarter-finals, from his first at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2005</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>David Ferrer</span></span> to his last at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2022 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2022</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Taylor Fritz</span></span> before withdrawing ahead of the semi-final against <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Nick Kyrgios</span></span>.
          </p>
          <p>
            Then come <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span> with <strong className="!text-amber-300">41</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span> with <strong className="!text-amber-300">36</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Ivan Lendl</span></span> with <strong className="!text-amber-300">34</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><span>Andy Murray</span></span> with <strong className="!text-amber-300">30</strong> Grand Slam quarter-finals reached.
          </p>
          <p>
            In this record, the quarter-final is the first true Grand Slam consistency checkpoint: reaching the last eight once marks a strong tournament, but doing it 50 or 60 times means spending an entire career as a permanent presence in the decisive stages of the majors.
          </p>
        </div>
      )}

      {narrativePath === '/records/most-masters-1000-finals-reached' && selectedRounds === 'F' && selectedLevels?.has('M') && (!selectedSurfaces || selectedSurfaces.size === 0) && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the ATP Masters 1000 list for most finals reached stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, with <strong className="!text-amber-300">60</strong> Masters 1000 finals, the highest total since the series began in 1990.
          </p>
          <p>
            His first final at this level came at Indian Wells <strong className="!text-amber-300">2007</strong>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, while his latest Masters 1000 final came at Miami <strong className="!text-amber-300">2025</strong>, against <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Jakub Mensik</span></span>.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, with <strong className="!text-amber-300">53</strong> Masters 1000 finals: his first came at Miami <strong className="!text-amber-300">2005</strong> against <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, and his last at Indian Wells <strong className="!text-amber-300">2022</strong>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Taylor Fritz</span></span>.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span> is third with <strong className="!text-amber-300">50</strong> Masters 1000 finals reached, from his first at Miami <strong className="!text-amber-300">2002</strong> against <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span> to his last at Miami <strong className="!text-amber-300">2019</strong> against <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John Isner</span></span>.
          </p>
          <p>
            Then come <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span>, with <strong className="!text-amber-300">22</strong> Masters 1000 finals, beginning with Indian Wells <strong className="!text-amber-300">1990</strong> against <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Stefan Edberg</span></span> and ending at Canada <strong className="!text-amber-300">2005</strong> against Nadal, and <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><span>Andy Murray</span></span>, with <strong className="!text-amber-300">21</strong>, from Cincinnati <strong className="!text-amber-300">2008</strong> against Djokovic to Paris <strong className="!text-amber-300">2016</strong> against Isner.
          </p>
          <p>
            In this record, the final itself is the milestone: reaching one means surviving an elite draw, doing it 50 or 60 times means spending an entire career as a permanent presence at the highest regular-season level of the ATP Tour.
          </p>
        </div>
      )}

      {narrativePath === '/records/most-hard-court-finals-reached' && selectedRounds === 'F' && selectedSurfaces?.has('Hard') && (!selectedLevels || selectedLevels.size === 0) && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for most hard-court finals reached stands <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, with <strong className="!text-amber-300">98</strong> ATP singles finals on hard courts, built from a hard-court finals record of 71 titles and 27 runner-up finishes.
          </p>
          <p>
            His first tour-level final came on indoor hard at <Link href={getTourneyHref({ slug: createSlug('Marseille'), year: 2000 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Marseille 2000</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Marc Rosset</span></span>, while his last hard-court final came at <Link href={getTourneyHref({ slug: createSlug('Basel'), year: 2019 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Basel 2019</Link>, against <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Alex de Minaur</span></span>.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, the only active player still chasing the record. He had reached 92 hard-court finals by August <strong className="!text-amber-300">2024</strong>, then added hard-court finals at <Link href={getTourneyHref({ slug: createSlug('Shanghai Masters'), year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Shanghai 2024</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" /><span>Jannik Sinner</span></span>, <Link href={getTourneyHref({ slug: createSlug('Miami'), year: 2025 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 2025</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Jakub Mensik</span></span>, <Link href={getTourneyHref({ slug: createSlug('Athens'), year: 2025 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Athens 2025</Link>, and the <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2026 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 2026</Link>, bringing him to <strong className="!text-amber-300">96</strong> hard-court finals reached. His first hard-court final had come at <Link href={getTourneyHref({ slug: createSlug('Metz'), year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Metz 2006</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="AUT" className="w-4 h-3" /><span>Jürgen Melzer</span></span>.
          </p>
          <p>
            Then comes <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span>, with <strong className="!text-amber-300">69</strong> hard-court finals, the third-highest total of the Open Era. His first hard-court final milestone came at <Link href={getTourneyHref({ slug: createSlug('Itaparica'), year: 1987 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Itaparica 1987</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="BRA" className="w-4 h-3" /><span>Luiz Mattar</span></span>, and his last major hard-court final came at the <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 2005</Link>, against Federer.
          </p>
          <p>
            Behind Agassi are <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span> with <strong className="!text-amber-300">56</strong> hard-court finals, <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><span>Andy Murray</span></span> with <strong className="!text-amber-300">55</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Ivan Lendl</span></span> with <strong className="!text-amber-300">54</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> with <strong className="!text-amber-300">52</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span> with <strong className="!text-amber-300">48</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Stefan Edberg</span></span> with <strong className="!text-amber-300">44</strong>.
          </p>
          <p>
            In this record, the final itself is the milestone: reaching one hard-court final means surviving the surface that dominates the modern calendar; reaching 90 or more means building an entire career around repeated deep runs from Australia to North America, Asia, indoor Europe and the year-end stage. Federer set the ceiling at <strong className="!text-amber-300">98</strong>, Djokovic remains close at <strong className="!text-amber-300">96</strong>, and Agassi is very far with his <strong className="!text-amber-300">69</strong>.
          </p>
        </div>
      )}

      {narrativePath === '/records/most-clay-court-finals-reached' && selectedRounds === 'F' && selectedSurfaces?.has('Clay') && (!selectedLevels || selectedLevels.size === 0) && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for most clay-court finals reached stands <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Guillermo Vilas</span></span>, with <strong className="!text-amber-300">77</strong> tour-level singles finals on clay, built from 49 clay titles and 28 runner-up finishes on the surface. His clay-finals story began at <Link href={getTourneyHref({ slug: createSlug('Cincinnati'), year: 1972 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Cincinnati 1972</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>, and stretched deep into the 1980s, with his final recorded clay-court final coming at <Link href={getTourneyHref({ slug: createSlug('Forest Hills WCT'), year: 1986 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Forest Hills WCT 1986</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Yannick Noah</span></span>.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, with <strong className="!text-amber-300">72</strong> clay-court finals, from an extraordinary <strong className="!text-amber-300">63–9</strong> finals record on the surface. Nadal’s first ATP final on clay came at <Link href={getTourneyHref({ slug: createSlug('Sopot'), year: 2004 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Sopot 2004</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>José Acasuso</span></span>;
            his 50th clay-court final came at <Link href={getTourneyHref({ slug: createSlug('Madrid'), year: 2014 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Madrid 2014</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="JPN" className="w-4 h-3" /><span>Kei Nishikori</span></span>, and his final clay-court title match came twenty years after the first, at <Link href={getTourneyHref({ slug: createSlug('Bastad'), year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Båstad 2024</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="POR" className="w-4 h-3" /><span>Nuno Borges</span></span>.
          </p>
          <p>
            Then comes <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Manuel Orantes</span></span>, one of the great clay-volume players of the 1970s, with his clay-final count built around <strong className="!text-amber-300">60</strong>  clay finals and repeated deep runs at events such as Barcelona, Rome, Hamburg, Monte-Carlo, the U.S. Clay Courts and the clay-era US Open, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span> in the 1975 final.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="AUT" className="w-4 h-3" /><span>Thomas Muster</span></span> follows as the dominant clay finalist of the 1990s: he reached <strong className="!text-amber-300">45</strong> clay-court finals, including Roland Garros <strong className="!text-amber-300">1995</strong>, Monte-Carlo, Rome, Barcelona, Estoril, Mexico City and many of the clay stops that defined his peak.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Björn Borg</span></span> also belongs to this historical group, with a <strong className="!text-amber-300">32–7</strong> record in clay-court finals — <strong className="!text-amber-300">38</strong> total finals — including six Roland Garros title matches won and repeated finals against Vilas, Connors, Orantes and Lendl.
          </p>
          <p>
            In this record, the final itself is the milestone: reaching one clay-court final means surviving the most physically demanding surface in the sport; reaching 70 or more means building an entire career around repeated deep runs on red dirt. Vilas set the historical ceiling with his 1970s clay volume, while Nadal turned clay finals into the clearest symbol of dominance the Open Era has ever seen.
          </p>
        </div>
      )}

      {narrativePath === '/records/most-grass-court-finals-reached' && selectedRounds === 'F' && selectedSurfaces?.has('Grass') && (!selectedLevels || selectedLevels.size === 0) && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for most grass-court finals reached stands <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, with <strong className="!text-amber-300">27</strong> tour-level singles finals on grass, built from an Open Era record 19 grass-court titles and 7 runner-up finishes.
          </p>
          <p>
            Federer’s first grass final came at <Link href={getTourneyHref({ slug: createSlug('Halle'), year: 2003 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Halle 2003</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Nicolas Kiefer</span></span>, while his final grass-court title match came at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2019 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2019</Link>, against <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>. His total is shaped by two historic strongholds: Wimbledon, where he reached 12 finals and won a men’s record eight titles, and Halle, where he reached 13 finals and won 10 titles.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>, <strong className="!text-amber-300">18</strong>, one of the great grass-volume players of the early Open Era, with his finals record spread across a much richer grass calendar than today’s. Connors reached grass finals at the Australian Open, Wimbledon, the grass-era US Open, and several tour events, including his Wimbledon title matches against <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Ken Rosewall</span></span> in <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 1974 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1974</Link>, <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Björn Borg</span></span> in <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 1977 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1977</Link> and <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 1978 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1978</Link>, and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John McEnroe</span></span> in <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 1982 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1982</Link> and <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 1984 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1984</Link>.
          </p>
          <p>
            Then come the great grass specialists of the serve-and-volley era: <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John McEnroe</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Boris Becker</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>John Newcombe</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Ken Rosewall</span></span>. Sampras’ grass-finals profile is concentrated above all at Wimbledon, where he reached seven finals and won all seven, including title matches against <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jim Courier</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="HRV" className="w-4 h-3" /><span>Goran Ivanišević</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Boris Becker</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Patrick Rafter</span></span>.
          </p>
          <p>
            Djokovic <strong className="!text-amber-300">14</strong> is the modern active reference point behind Federer: his grass finals include repeated appearances at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2011 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link>, from his first final there against Nadal to later title matches against Federer, Matteo Berrettini, Nick Kyrgios and Carlos Alcaraz.
          </p>
          <p>
            In this record, the final itself is the milestone: grass offers the shortest window of the tennis season, so reaching title matches repeatedly on the surface requires not only dominance, but timing, adaptation and durability. Federer set the modern ceiling at <strong className="!text-amber-300">27</strong> grass-court finals; Connors represents the grass-heavy calendar of the 1970s; while Sampras, Becker, McEnroe and Djokovic define different eras of elite grass-court excellence.
          </p>
        </div>
      )}

      {narrativePath === '/records/most-carpet-court-finals-reached' && selectedRounds === 'F' && selectedSurfaces?.has('Carpet') && (!selectedLevels || selectedLevels.size === 0) && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for most carpet-court finals reached stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>, with <strong className="!text-amber-300">69</strong> tour-level singles finals on carpet, built around his ATP-listed total of 45 carpet titles, the highest title count on the surface.
          </p>
          <p>
            His carpet-finals story began in the early 1970s, when indoor carpet was one of the key surfaces of the men’s tour, and reached some of its most important milestones at events such as <Link href={getTourneyHref({ slug: createSlug('Philadelphia') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Philadelphia</Link>, <Link href={getTourneyHref({ slug: createSlug('U.S. National Indoor') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">U.S. National Indoor</Link>, <Link href={getTourneyHref({ slug: createSlug('WCT Finals') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">WCT Finals</Link>, <Link href={getTourneyHref({ slug: createSlug('Wembley') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wembley</Link>, <Link href={getTourneyHref({ slug: createSlug('Tokyo Indoor') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Tokyo Indoor</Link> and <Link href={getTourneyHref({ slug: createSlug('Toulouse') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Toulouse</Link>; one of his final carpet title matches came at <Link href={getTourneyHref({ slug: createSlug('Toulouse'), year: 1989 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Toulouse 1989</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John McEnroe</span></span>, before closing his ATP finals record later that year at <Link href={getTourneyHref({ slug: createSlug('Tel Aviv'), year: 1989 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Tel Aviv 1989</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="ISR" className="w-4 h-3" /><span>Gilad Bloom</span></span>.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John McEnroe</span></span>, with <strong className="!text-amber-300">57</strong> carpet-court finals, from a surface finals record of 43 titles and 14 runner-up finishes. McEnroe’s carpet profile is one of the clearest symbols of the indoor era: his first carpet final came at <Link href={getTourneyHref({ slug: createSlug('Hartford WCT'), year: 1978 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Hartford WCT 1978</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="RSA" className="w-4 h-3" /><span>Johan Kriek</span></span>, while his late-career carpet milestones included titles at <Link href={getTourneyHref({ slug: createSlug('WCT Finals'), year: 1989 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">WCT Finals 1989</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Brad Gilbert</span></span> and <Link href={getTourneyHref({ slug: createSlug('Chicago'), year: 1991 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Chicago 1991</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Patrick McEnroe</span></span>.
          </p>
          <p>
            Then comes <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Ivan Lendl</span></span>, whose carpet-final volume was built from <strong className="!text-amber-300">48</strong> carpet finals, with repeated finals at the <Link href={getTourneyHref({ slug: createSlug('ATP Finals') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">ATP Finals</Link>, <Link href={getTourneyHref({ slug: createSlug('WCT Finals') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">WCT Finals</Link>, <Link href={getTourneyHref({ slug: createSlug('Philadelphia') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Philadelphia</Link>, <Link href={getTourneyHref({ slug: createSlug('Tokyo Indoor') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Tokyo Indoor</Link>, <Link href={getTourneyHref({ slug: createSlug('Wembley') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wembley</Link>, <Link href={getTourneyHref({ slug: createSlug('Milan Indoor') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Milan Indoor</Link>, <Link href={getTourneyHref({ slug: createSlug('Sydney Indoor') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Sydney Indoor</Link> and <Link href={getTourneyHref({ slug: createSlug('Stuttgart Indoor') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Stuttgart Indoor</Link>. Lendl’s most important carpet milestones include his <Link href={getTourneyHref({ slug: createSlug('ATP Finals') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">ATP Finals</Link> title matches against <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Björn Borg</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John McEnroe</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Boris Becker</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Mats Wilander</span></span>, all part of a decade in which carpet was central to the indoor championship season.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Boris Becker</span></span> follows as the great carpet finalist of the late 1980s and 1990s, with <strong className="!text-amber-300">37</strong> carpet finals spread across <Link href={getTourneyHref({ slug: createSlug('Wembley') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wembley</Link>, <Link href={getTourneyHref({ slug: createSlug('WCT Finals') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">WCT Finals</Link>, <Link href={getTourneyHref({ slug: createSlug('Milan Indoor') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Milan Indoor</Link>, <Link href={getTourneyHref({ slug: createSlug('Paris Masters') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Paris Masters</Link>, <Link href={getTourneyHref({ slug: createSlug('Stockholm') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Stockholm</Link>, <Link href={getTourneyHref({ slug: createSlug('Stuttgart Indoor') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Stuttgart Indoor</Link>, <Link href={getTourneyHref({ slug: createSlug('Brussels Indoor') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Brussels Indoor</Link> and the <Link href={getTourneyHref({ slug: createSlug('ATP Finals') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">ATP Finals</Link>. <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Stefan Edberg</span></span> completes the main historical group, with 11 carpet titles and repeated finals against Becker, Lendl, McEnroe and Agassi at events such as <Link href={getTourneyHref({ slug: createSlug('Tokyo Indoor') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Tokyo Indoor</Link>, <Link href={getTourneyHref({ slug: createSlug('Paris Masters') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Paris Masters</Link>, <Link href={getTourneyHref({ slug: createSlug('Rotterdam') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rotterdam</Link>, <Link href={getTourneyHref({ slug: createSlug('Basel') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Basel</Link>, <Link href={getTourneyHref({ slug: createSlug('Stockholm') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Stockholm</Link> and the <Link href={getTourneyHref({ slug: createSlug('ATP Finals') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">ATP Finals</Link>.
          </p>
          <p>
            In this record, carpet is a frozen category: unlike hard, clay or grass, it no longer exists at ATP Tour level after the surface was removed from top-tier men’s tournaments in 2009. That makes Connors’ and McEnroe’s totals effectively untouchable — records from a vanished indoor era, when reaching carpet finals was one of the defining measures of fast-court excellence.
          </p>
        </div>
      )}

      {narrativePath === '/records/most-atp-titles' && !selectedSurfaces && !selectedLevels && !selectedRounds && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for most ATP singles titles won stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>, with <strong className="!text-amber-300">109</strong> tour-level titles, the highest total in men’s Open Era history.
          </p>
          <p>
            Connors was the first man to reach the 100-title milestone, doing so at the US Open <strong className="!text-amber-300">1983</strong>, and his final title came at Tel Aviv <strong className="!text-amber-300">1989</strong>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="ISR" className="w-4 h-3" /><span>Gilad Bloom</span></span>. [atptour.com], [guinnessworldrecords.com]
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, with <strong className="!text-amber-300">103</strong> ATP singles titles. Federer’s first title came at Milan <strong className="!text-amber-300">2001</strong>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Julien Boutter</span></span>, while his 100th title arrived at Dubai <strong className="!text-amber-300">2019</strong> against <span className="inline-flex items-center gap-2"><Flag ioc="GRC" className="w-4 h-3" /><span>Stefanos Tsitsipas</span></span>; later that same season, he won his final title at Basel <strong className="!text-amber-300">2019</strong> against <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Alex de Minaur</span></span>. [atptour.com], [toomanyrackets.com]
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span> is the highest active player in the chase, currently with <strong className="!text-amber-300">101</strong> ATP singles titles. His first title came at <Link href={getTourneyHref({ slug: createSlug('Amersfoort'), year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Amersfoort 2006</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="CHI" className="w-4 h-3" /><span>Nicolás Massú</span></span>; he became the third man in the Open Era to reach 100 titles at Geneva <strong className="!text-amber-300">2025</strong>, and then added his 101st at Athens <strong className="!text-amber-300">2025</strong>, defeating <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" /><span>Lorenzo Musetti</span></span>. [toomanyrackets.com], [tennis.com]
          </p>
          <p>
            Then come <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Ivan Lendl</span></span>, with <strong className="!text-amber-300">94</strong> ATP titles, and <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, with <strong className="!text-amber-300">92</strong>. Lendl remains the only other man above the 90-title mark besides Connors, Federer, Djokovic and Nadal, while Nadal’s title story began at <Link href={getTourneyHref({ slug: createSlug('Sopot'), year: 2004 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Sopot 2004</Link> and closed with his 14th Roland Garros crown in <strong className="!text-amber-300">2022</strong>. [en.wikipedia.org], [atptour.com]
          </p>
          <p>
            In this record, the milestone is the trophy itself: winning one ATP title is a breakthrough, reaching 50 is a great career, reaching 90 belongs to an all-time legend, and crossing 100 has been achieved only by Connors, Federer and Djokovic.
          </p>
        </div>
      )}

      {narrativePath === '/records/most-masters-1000-semifinals-reached' && selectedRounds === 'SF' && selectedLevels?.has('M') && (!selectedSurfaces || selectedSurfaces.size === 0) && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the ATP Masters 1000 list for most semifinals reached stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, with a record <strong className="!text-amber-300">80</strong> Masters 1000 semifinals, the highest total since the series began in 1990.
          </p>
          <p>
            His first semifinal at this level came at Indian Wells <strong className="!text-amber-300">2007</strong>, while his milestone 80th Masters 1000 semifinal came at Shanghai <strong className="!text-amber-300">2025</strong>, after defeating <span className="inline-flex items-center gap-2"><Flag ioc="BEL" className="w-4 h-3" /><span>Zizou Bergs</span></span> in the quarter-finals to set up a last-four meeting with <span className="inline-flex items-center gap-2"><Flag ioc="MCO" className="w-4 h-3" /><span>Valentin Vacherot</span></span>.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, with <strong className="!text-amber-300">76</strong> Masters 1000 semifinals: his first came at Miami <strong className="!text-amber-300">2005</strong>, and his last at Indian Wells <strong className="!text-amber-300">2022</strong>.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span> is third with <strong className="!text-amber-300">66</strong> Masters 1000 semifinals, from his first at Miami <strong className="!text-amber-300">2002</strong> to his last at Miami <strong className="!text-amber-300">2019</strong>.
          </p>
          <p>
            Then come <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><span>Andy Murray</span></span>, with <strong className="!text-amber-300">33</strong> semifinals, from Canada <strong className="!text-amber-300">2006</strong> to Paris <strong className="!text-amber-300">2016</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span>, with <strong className="!text-amber-300">32</strong>, from Indian Wells <strong className="!text-amber-300">1990</strong> to Canada <strong className="!text-amber-300">2005</strong>.
          </p>
          <p>
            In this record, the semifinal is the consistency marker: reaching the last four once means surviving an elite Masters draw, but doing it 60, 70 or 80 times means spending an entire career as a permanent presence at the highest regular-season level of the ATP Tour.
          </p>
        </div>
      )}

      {narrativePath === '/records/most-masters-1000-quarterfinals-reached' && selectedRounds === 'QF' && selectedLevels?.has('M') && (!selectedSurfaces || selectedSurfaces.size === 0) && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the ATP Masters 1000 list for most quarter-finals reached stands <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, with <strong className="!text-amber-300">99</strong> Masters 1000 quarter-finals, the highest total since the series began in 1990.
          </p>
          <p>
            His first quarter-final at this level came at Miami <strong className="!text-amber-300">2005</strong>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Thomas Johansson</span></span> on the way to his first Masters 1000 final; his last Masters 1000 quarter-final came at Madrid <strong className="!text-amber-300">2022</strong>, against <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Carlos Alcaraz</span></span>.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, with <strong className="!text-amber-300">97</strong> Masters 1000 quarter-finals reached; one of his earliest last-eight milestones came at Madrid <strong className="!text-amber-300">2006</strong>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="CHL" className="w-4 h-3" /><span>Fernando González</span></span>, while his latest came at Shanghai <strong className="!text-amber-300">2025</strong>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="BEL" className="w-4 h-3" /><span>Zizou Bergs</span></span> in the quarter-finals to reach his record 80th Masters 1000 semi-final.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span> is third with <strong className="!text-amber-300">87</strong> Masters 1000 quarter-finals. His first major run at this level came at Miami <strong className="!text-amber-300">2002</strong>, where he reached the final after coming through the quarter-final stage, before facing <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span> in the title match; his final Masters 1000 quarter-final came at Shanghai <strong className="!text-amber-300">2019</strong>, against <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Alexander Zverev</span></span>, which was also his last appearance at this level.
          </p>
          <p>
            Then comes <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><span>Andy Murray</span></span>, with <strong className="!text-amber-300">51</strong> Masters 1000 quarter-finals: his first came at Canada <strong className="!text-amber-300">2006</strong> against <span className="inline-flex items-center gap-2"><Flag ioc="FIN" className="w-4 h-3" /><span>Jarkko Nieminen</span></span>, and his last deep Masters run ended with the Paris <strong className="!text-amber-300">2016</strong> title campaign, including a quarter-final against <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Tomas Berdych</span></span>.
          </p>
          <p>
            Behind them, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Tomas Berdych</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>David Ferrer</span></span> are tied at <strong className="!text-amber-300">45</strong> Masters 1000 quarter-finals, followed by <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span> with <strong className="!text-amber-300">44</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Alexander Zverev</span></span> with <strong className="!text-amber-300">39</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andy Roddick</span></span> with <strong className="!text-amber-300">35</strong>.
          </p>
          <p>
            In this record, the quarter-final is the first real Masters 1000 consistency checkpoint: reaching the last eight once means surviving an elite draw, but doing it 80, 90 or nearly 100 times means being a permanent presence in the decisive rounds of the ATP Tour’s highest regular-season events.
          </p>
        </div>
      )}

      {error ? (
        <div className="text-center py-8 text-gray-300">{error}</div>
      ) : loading && !hasRows ? (
        <div className="text-center py-8 text-gray-300">Loading...</div>
      ) : hasRows ? (
        <>
          {renderTable(currentData, start)}
          {totalPages > 1 && !showModal && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
          <Modal
            show={showModal}
            onClose={() => setShowModal(false)}
            title="Players with Most Appearances"
          >
            {renderTable(allPlayers)}
          </Modal>
        </>
      ) : (
        <div className="text-center py-8 text-gray-300">No data available.</div>
      )}
    </section>
  );
}
