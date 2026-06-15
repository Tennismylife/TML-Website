'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Flag from '@/components/Flag';
import { createSlug, getTourneyHref } from '@/lib/utils';
import { playerSurfaceOrMatchesUrl } from "../nav";
import { useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';

interface TitlesSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  description?: string;
  initialData?: TitleRecord[];
}

type TitleRecord = {
  id: string;
  player_name: string;
  ioc: string | null;
  total_titles: number;
  year: number;
};

export default function TitlesSection({ selectedSurfaces, selectedLevels, fetchEnabled, setFetchEnabled, fetchRequestId, description, initialData }: TitlesSectionProps) {
  const enabled = !!fetchEnabled;
  const [topSeasonTitles, setTopSeasonTitles] = useState<TitleRecord[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [showModalTitles, setShowModalTitles] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;
  const searchParams = useSearchParams();
  const lastRequestRef = useRef<string | null>(null);

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels]);

  useEffect(() => {
    // If SSR passed `initialData`, trigger client fetch on mount so the
    // client replaces the SSR top‑10 with the full `limit=100` result set.
    const shouldFetch = showModalTitles || (enabled && fetchRequestId && lastRequestRef.current !== fetchRequestId) || (Array.isArray(initialData) && initialData.length > 0);
    if (!shouldFetch) {
      if (Array.isArray(initialData)) setTopSeasonTitles(initialData);
      setLoading(false);
      return;
    }

    if (fetchRequestId) lastRequestRef.current = fetchRequestId;

    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('level', l));
        query.set('limit', showModalTitles ? '1000' : '100');
        const url = `/api/records/seasons/titles?${query.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch titles')
        const data: TitleRecord[] = await res.json();
        setTopSeasonTitles(Array.isArray(data) ? data : []);
        setPage(1);
      } catch (err) {
        console.error(err);
        setTopSeasonTitles([]);
      } finally {
        setLoading(false);
        if (enabled) setFetchEnabled?.(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, enabled, fetchRequestId, showModalTitles, initialData, setFetchEnabled]);

  if (loading) return <div className="text-center py-8 text-gray-300 text-lg">Loading...</div>;
  if (!topSeasonTitles.length) return <div className="text-center py-8 text-gray-300 text-lg">No titles found.</div>;

  const totalPages = Math.ceil(topSeasonTitles.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = topSeasonTitles.slice(start, start + perPage);

  const isMostMasters1000TitlesInSingleSeason = description === 'Most Masters 1000 Titles in a Single Season';
  const topMasters1000TitlesSeason = isMostMasters1000TitlesInSingleSeason ? topSeasonTitles[0] : undefined;
  const isMostTitlesInSingleSeason = description === 'Most Titles in Single Season';
  const isMostGrandSlamTitlesInSingleSeason = description === 'Most Grand Slam Titles in a Single Season';
  const isMostHardCourtTitlesInSingleSeason = description === 'Most Hard Court Titles in a Single Season';
  const isMostClayCourtTitlesInSingleSeason = description === 'Most Clay Court Titles in a Single Season';
  const isMostGrassCourtTitlesInSingleSeason = description === 'Most Grass Court Titles in a Single Season';
  const isMostCarpetCourtTitlesInSingleSeason = description === 'Most Carpet Court Titles in a Single Season';
  const topTitlesSeason = isMostTitlesInSingleSeason ? topSeasonTitles[0] : undefined;
  const secondTitlesSeason = isMostTitlesInSingleSeason ? topSeasonTitles[1] : undefined;
  const thirdTitlesSeason = isMostTitlesInSingleSeason ? topSeasonTitles[2] : undefined;
  const topGrandSlamTitlesSeason = isMostGrandSlamTitlesInSingleSeason ? topSeasonTitles[0] : undefined;
  const topHardCourtTitlesSeason = isMostHardCourtTitlesInSingleSeason ? topSeasonTitles[0] : undefined;
  const topClayCourtTitlesSeason = isMostClayCourtTitlesInSingleSeason ? topSeasonTitles[0] : undefined;
  const topCarpetCourtTitlesSeason = isMostCarpetCourtTitlesInSingleSeason ? topSeasonTitles[0] : undefined;
  const topGrassCourtTitlesSeason = isMostGrassCourtTitlesInSingleSeason ? topSeasonTitles[0] : undefined;

  const renderTable = (data: TitleRecord[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Titles</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Year</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const rank = startIndex + idx + 1;
            return (
              <tr key={`${p.id}-${p.year}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-400 font-semibold">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center justify-center gap-2 text-lg text-gray-200">
                  {p.ioc && <Flag ioc={p.ioc ?? undefined} className="w-4 h-3" />} 
                  <Link href={playerSurfaceOrMatchesUrl((p as any).slug ?? String(p.id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="hover:underline">{p.player_name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.total_titles}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-300">
                  <Link href={`/players/${encodeURIComponent((p as any).slug ?? String(p.id))}/season/${p.year}`} className="hover:underline">{p.year}</Link>
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

      {isMostTitlesInSingleSeason && topTitlesSeason && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of this list, the record is not owned by one man alone. In the Open Era, three players have reached the same extraordinary ceiling: <strong className="!text-amber-300">16 singles titles</strong> in one season — <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" />Rod Laver</span> in <strong className="!text-sky-300">1969</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" />Guillermo Vilas</span> in <strong className="!text-sky-300">1977</strong> and <span className="inline-flex items-center gap-2"><Flag ioc="ROU" className="w-4 h-3" />Ilie Nastase</span> in <strong className="!text-sky-300">1973</strong>.
          </p>
          <p>
            Rod Laver stands first chronologically, and his 1969 season remains the purest symbol of total dominance. Laver won <strong className="!text-amber-300">16 titles</strong> that year, but the number is only part of the story: 1969 was also the season in which he completed the <strong className="!text-emerald-300">Calendar Grand Slam</strong>, winning the Australian Open, Roland Garros, Wimbledon and the US Open in the same year.
          </p>
          <p>
            Ilie Năstase matched that total in 1973, another season from the early Open Era when the calendar was dense, varied and physically demanding. Năstase’s <strong className="!text-amber-300">16-title</strong> campaign came in the same year he won Roland Garros and became one of the defining figures of the sport’s first computerized ranking era.
          </p>
          <p>
            Guillermo Vilas produced the most famous volume season of them all in 1977. His year is remembered for relentless accumulation: <strong className="!text-amber-300">16 ATP titles</strong>, a massive match-win total, and major victories at Roland Garros and the US Open. It was also the year in which Vilas broke through at Roland Garros and later defeated Jimmy Connors at the US Open.
          </p>
          <p>
            Jimmy Connors came closest to joining that record group with <strong className="!text-amber-300">15 titles</strong> in 1974, while Ivan Lendl matched that second-best total in 1982. Both seasons were enormous in their own right, with Connors winning three Grand Slams in 1974 and Lendl establishing the week-to-week superiority that would define his decade.
          </p>
          <p>
            The modern era has made this record much harder to approach. Roger Federer reached <strong className="!text-amber-300">12 titles</strong> in 2006, finishing <span className="text-white">92-5</span> and winning three Grand Slams, and yet even that exceptional year still feels distant from the <strong className="!text-amber-300">16-title mark</strong>. Sixteen titles in a single season remains a measure of durability, scheduling, hunger and the ability to keep turning weeks into trophies.
          </p>
        </div>
      )}

      {isMostGrandSlamTitlesInSingleSeason && topGrandSlamTitlesSeason && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            Most Grand Slam Titles in a Single Season highlights the biggest major-winning years in men's tennis, with the Open Era still anchored by Rod Laver's 1969 Calendar Grand Slam and the modern chase defined by repeated three-major seasons. The list shows how rare it is for a player to turn the four majors into a near-clean sweep across one calendar year.
          </p>
          <p>
            At the top of the list stands <span className="inline-flex items-center gap-2">{topGrandSlamTitlesSeason.ioc && <Flag ioc={topGrandSlamTitlesSeason.ioc} className="w-4 h-3" />}{topGrandSlamTitlesSeason.player_name}</span>, whose <strong className="!text-sky-300">{topGrandSlamTitlesSeason.year}</strong> season remains the only <strong className="!text-amber-300">4-Slam</strong> season in men's singles during the Open Era. <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><Link href="/players/rod-laver" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rod Laver</Link></span> won the <Link href="/tournaments/australian-open/1969" className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, <Link href="/tournaments/roland-garros/1969" className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link>, <Link href="/tournaments/wimbledon/1969" className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link> and the <Link href="/tournaments/us-open/1969" className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link> in the same calendar year, completing the Grand Slam for the second time in his career and the only time by a man in the Open Era. What makes Laver's <strong className="!text-sky-300">1969</strong> record unique is its absolute nature: there is no higher number to chase. A player can match it, but never surpass it. From Australia to Paris, from Wimbledon to Forest Hills, Laver won every major title available, turning one season into the ultimate benchmark for Grand Slam dominance.
          </p>
          <p>
            Behind him stands a select group of players who reached <strong className="!text-amber-300">3 Grand Slam titles</strong> in a single season, coming within one tournament of perfection. <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href="/players/jimmy-connors" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Jimmy Connors</Link></span> did it in <strong className="!text-sky-300">1974</strong>, winning the <Link href="/tournaments/australian-open/1974" className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, <Link href="/tournaments/wimbledon/1974" className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link> and the <Link href="/tournaments/us-open/1974" className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link> during one of the most dominant seasons of the early Open Era. His year was stopped from becoming a Grand Slam season by circumstance as much as by competition: Connors did not play <Link href="/tournaments/roland-garros/1974" className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link>, leaving his three-major campaign as one of the great "what if" seasons in tennis history.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><Link href="/players/mats-wilander" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Mats Wilander</Link></span> matched the three-Slam mark in <strong className="!text-sky-300">1988</strong>, winning the <Link href="/tournaments/australian-open/1988" className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, <Link href="/tournaments/roland-garros/1988" className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> and the <Link href="/tournaments/us-open/1988" className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>. His US Open victory over Ivan Lendl gave him both his third major of the season and the world No. 1 ranking for the first time. Unlike Connors, Wilander's season was built across three different major environments: Rebound Ace in Australia, clay in Paris and hard court in New York.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><Link href="/players/roger-federer" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span> made the three-Slam season a modern standard. He achieved it three times in <strong className="!text-sky-300">2004, 2006 and 2007</strong>, each time winning the <Link href="/tournaments/australian-open/2004" className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, <Link href="/tournaments/wimbledon/2004" className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link> and the <Link href="/tournaments/us-open/2004" className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>. Federer's repeated three-major seasons are what make his peak so historically distinct: he did not only approach Laver once; he returned to that level year after year.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href="/players/rafael-nadal" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rafael Nadal</Link></span> joined the group in <strong className="!text-sky-300">2010</strong> with one of the most complete surface seasons ever played. Nadal won <Link href="/tournaments/roland-garros/2010" className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link>, <Link href="/tournaments/wimbledon/2010" className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link> and the <Link href="/tournaments/us-open/2010" className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>, becoming the first man since Laver in 1969 to win that French-Wimbledon-US Open triplet in the same calendar year. His 2010 run was especially symbolic because it completed his Career Grand Slam at the US Open, while also showing his dominance across clay, grass and hard court.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><Link href="/players/novak-djokovic" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Novak Djokovic</Link></span> has built the deepest modern challenge to Laver's record. Djokovic won three Grand Slam titles in <strong className="!text-sky-300">2011, 2015, 2021 and 2023</strong>, making him the only man in the Open Era to produce four separate three-major seasons.
          </p>
          <p>
            Djokovic's <strong className="!text-sky-300">2021</strong> season came closest to matching Laver outright: he won the <Link href="/tournaments/australian-open/2021" className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, <Link href="/tournaments/roland-garros/2021" className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> and <Link href="/tournaments/wimbledon/2021" className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link>, then reached the <Link href="/tournaments/us-open/2021" className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link> final with the Calendar Grand Slam still alive. He stopped one match short. That is the difference between a great season and the perfect season, and it explains why Laver's 1969 still stands alone.
          </p>
        </div>
      )}

      {isMostMasters1000TitlesInSingleSeason && topMasters1000TitlesSeason && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            Most Masters 1000 Titles in a Single Season captures the rare seasons when a player controls the ATP's biggest regular-tour events across hard court and clay. The benchmark remains six titles in one year, a total that demands not just peak level but repeated wins in the sport's most competitive Masters 1000 draws, from <Link href="/tournaments/indian-wells-masters/2015" className="!text-orange-300 hover:!text-orange-100 font-semibold">Indian Wells</Link> and <Link href="/tournaments/miami-masters/2015" className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami</Link> to <Link href="/tournaments/monte-carlo-masters/2015" className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte Carlo</Link>, <Link href="/tournaments/rome-masters/2015" className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome</Link>, <Link href="/tournaments/shanghai/2015" className="!text-orange-300 hover:!text-orange-100 font-semibold">Shanghai</Link> and <Link href="/tournaments/paris-masters/2015" className="!text-orange-300 hover:!text-orange-100 font-semibold">Paris</Link>.
          </p>
          <p>
            At the top of the list stands <span className="inline-flex items-center gap-2">{topMasters1000TitlesSeason.ioc && <Flag ioc={topMasters1000TitlesSeason.ioc} className="w-4 h-3" />}{topMasters1000TitlesSeason.player_name}</span>, whose <strong className="!text-sky-300">{topMasters1000TitlesSeason.year}</strong> season produced the greatest Masters 1000 title haul in ATP history. <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><Link href="/players/novak-djokovic" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Novak Djokovic</Link></span> won <strong className="!text-amber-300">6 Masters 1000 titles</strong> that year — <Link href="/tournaments/indian-wells-masters/2015" className="!text-orange-300 hover:!text-orange-100 font-semibold">Indian Wells</Link>, <Link href="/tournaments/miami-masters/2015" className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami</Link>, <Link href="/tournaments/monte-carlo-masters/2015" className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte Carlo</Link>, <Link href="/tournaments/rome-masters/2015" className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome</Link>, <Link href="/tournaments/shanghai/2015" className="!text-orange-300 hover:!text-orange-100 font-semibold">Shanghai</Link> and <Link href="/tournaments/paris-masters/2015" className="!text-orange-300 hover:!text-orange-100 font-semibold">Paris</Link> — becoming the only man to win six tournaments of this category in a single season. What makes Djokovic's <strong className="!text-sky-300">2015</strong> record so difficult to match is the structure of the Masters calendar itself. There are only <strong className="!text-orange-300">nine</strong> Masters 1000 events in a season, spread across hard courts and clay, across North America, Europe and Asia. Winning <strong className="!text-amber-300">six</strong> of them means controlling two thirds of the entire elite best-of-three calendar. Djokovic did not simply dominate one part of the season: he won the Sunshine Double at <Link href="/tournaments/indian-wells-masters/2015" className="!text-orange-300 hover:!text-orange-100 font-semibold">Indian Wells</Link> and <Link href="/tournaments/miami-masters/2015" className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami</Link>, added clay-court titles in <Link href="/tournaments/monte-carlo-masters/2015" className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte Carlo</Link> and <Link href="/tournaments/rome-masters/2015" className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome</Link>, then finished the Masters year with <Link href="/tournaments/shanghai/2015" className="!text-orange-300 hover:!text-orange-100 font-semibold">Shanghai</Link> and <Link href="/tournaments/paris-masters/2015" className="!text-orange-300 hover:!text-orange-100 font-semibold">Paris</Link>.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><Link href="/players/novak-djokovic" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Novak Djokovic</Link></span> had already set the previous benchmark in <strong className="!text-sky-300">2011</strong>, when he won <strong className="!text-amber-300">5 Masters 1000 titles</strong>: <Link href="/tournaments/indian-wells-masters/2011" className="!text-orange-300 hover:!text-orange-100 font-semibold">Indian Wells</Link>, <Link href="/tournaments/miami-masters/2011" className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami</Link>, <Link href="/tournaments/madrid-masters/2011" className="!text-orange-300 hover:!text-orange-100 font-semibold">Madrid</Link>, <Link href="/tournaments/rome-masters/2011" className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome</Link> and <Link href="/tournaments/canada-masters/2011" className="!text-orange-300 hover:!text-orange-100 font-semibold">Montreal</Link>, while <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href="/players/rafael-nadal" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rafael Nadal</Link></span> matched the five-title mark in <strong className="!text-sky-300">2013</strong>, winning <Link href="/tournaments/indian-wells-masters/2013" className="!text-orange-300 hover:!text-orange-100 font-semibold">Indian Wells</Link>, <Link href="/tournaments/madrid-masters/2013" className="!text-orange-300 hover:!text-orange-100 font-semibold">Madrid</Link>, <Link href="/tournaments/rome-masters/2013" className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome</Link>, <Link href="/tournaments/canada-masters/2013" className="!text-orange-300 hover:!text-orange-100 font-semibold">Montreal</Link> and <Link href="/tournaments/cincinnati-masters/2013" className="!text-orange-300 hover:!text-orange-100 font-semibold">Cincinnati</Link>.
          </p>
          <p>
            Behind the five-title seasons sits a group of four-title campaigns. <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><Link href="/players/roger-federer" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span> reached <strong className="!text-amber-300">4 Masters 1000 titles</strong> in both <strong className="!text-sky-300">2005</strong> and <strong className="!text-sky-300">2006</strong>, while Nadal also won <strong className="!text-orange-300">4</strong> in <strong className="!text-sky-300">2005</strong>.
          </p>
          <p>
            That is why Djokovic's 2015 record still stands apart. Six Masters 1000 titles in one season is not just a measure of peak level; it is a measure of sustained control across the most demanding regular-tour events in men's tennis.
          </p>
        </div>
      )}

      {isMostHardCourtTitlesInSingleSeason && topHardCourtTitlesSeason && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            Most Hard Court Titles in a Single Season reaches its Open Era benchmark with <span className="inline-flex items-center gap-2">{topHardCourtTitlesSeason.ioc && <Flag ioc={topHardCourtTitlesSeason.ioc} className="w-4 h-3" />}{topHardCourtTitlesSeason.player_name}</span>, whose {topHardCourtTitlesSeason.year} season remains the greatest hard-court title haul of the Open Era. Federer won <strong className="!text-amber-300">9 hard-court titles</strong> that year: <Link href={getTourneyHref({ slug: createSlug('Doha'), year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Doha</Link>, the <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, <Link href={getTourneyHref({ slug: createSlug('Indian Wells'), year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Indian Wells</Link>, <Link href={getTourneyHref({ slug: createSlug('Miami'), year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami</Link>, <Link href={getTourneyHref({ slug: 'canada-masters', year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Canada</Link>, the <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>, <Link href={getTourneyHref({ slug: createSlug('Tokyo'), year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Tokyo</Link>, <Link href={getTourneyHref({ slug: 'madrid-masters', year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Madrid</Link> and the <Link href={getTourneyHref({ slug: 'atp-finals', year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Masters Cup</Link>. What makes Federer's record so difficult to match is not only the number, but the range of events behind it. His hard-court season began in January with titles in Doha and at the Australian Open, continued with the Indian Wells–Miami double in spring, resumed with Canada and the US Open in the North American summer, and ended indoors with Madrid and the Masters Cup.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" />Novak Djokovic</span> came closest in the modern era. In 2015, he won <strong className="!text-amber-300">8 hard-court titles</strong>: the <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2015 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, <Link href={getTourneyHref({ slug: createSlug('Indian Wells'), year: 2015 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Indian Wells</Link>, <Link href={getTourneyHref({ slug: createSlug('Miami'), year: 2015 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami</Link>, the <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 2015 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>, <Link href={getTourneyHref({ slug: 'beijing', year: 2015 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Beijing</Link>, <Link href={getTourneyHref({ slug: 'shanghai', year: 2015 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Shanghai</Link>, <Link href={getTourneyHref({ slug: 'paris-masters', year: 2015 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Paris</Link> and the <Link href={getTourneyHref({ slug: 'atp-finals', year: 2015 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">ATP Finals</Link>. Djokovic's 2015 campaign is different from Federer's 2006 because it was built around the biggest hard-court stages.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" />Jannik Sinner</span> produced the strongest recent challenge in 2024, with <strong className="!text-amber-300">7 hard-court titles</strong>: the <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, <Link href={getTourneyHref({ slug: 'rotterdam', year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rotterdam</Link>, <Link href={getTourneyHref({ slug: createSlug('Miami'), year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami</Link>, <Link href={getTourneyHref({ slug: 'cincinnati-masters', year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Cincinnati</Link>, the <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>, <Link href={getTourneyHref({ slug: 'shanghai', year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Shanghai</Link> and the <Link href={getTourneyHref({ slug: 'atp-finals', year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">ATP Finals</Link>. Even with two hard-court majors, multiple Masters 1000 titles and the year-end Finals, he still finished two titles short of Federer's mark.
          </p>
          <p>
            That is why Federer's 2006 season remains the benchmark. <strong className="!text-amber-300">9 hard-court titles</strong> in one season is not just a measure of surface dominance. It is a measure of durability, scheduling, consistency and the ability to keep converting deep runs into trophies across the entire year. From Doha to Shanghai, Federer turned the hard-court calendar into a season-long title run — and nobody in the modern game has gone beyond it.
          </p>
        </div>
      )}

      {isMostClayCourtTitlesInSingleSeason && topClayCourtTitlesSeason && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            Most Clay-Court Titles in a Single Season reaches its Open Era benchmark with <span className="inline-flex items-center gap-2">{topClayCourtTitlesSeason.ioc && <Flag ioc={topClayCourtTitlesSeason.ioc} className="w-4 h-3" />}{topClayCourtTitlesSeason.player_name}</span>, whose {topClayCourtTitlesSeason.year} season remains the greatest clay-court title haul of the Open Era. Vilas won <strong className="!text-amber-300">14 titles on clay</strong> that year, setting the benchmark for single-season dominance on the surface. What makes the record so difficult to match is the scale of the season. Vilas did not simply dominate the European clay swing; he kept winning on clay across the entire calendar, from South America to Europe to North America. His 1977 clay haul included the two biggest clay-court titles of that season: <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 1977 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> and the <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 1977 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>, which was still played on clay at Forest Hills.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="AUT" className="w-4 h-3" />Thomas Muster</span> came closest in the modern ATP structure. In 1995, he won <strong className="!text-amber-300">11 clay-court titles</strong>, including <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 1995 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link>, <Link href={getTourneyHref({ slug: 'monte-carlo-masters', year: 1995 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte Carlo</Link>, <Link href={getTourneyHref({ slug: 'rome-masters', year: 1995 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome</Link>, <Link href={getTourneyHref({ slug: createSlug('Barcelona'), year: 1995 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Barcelona</Link>, <Link href={getTourneyHref({ slug: createSlug('Mexico City'), year: 1995 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Mexico City</Link>, <Link href={getTourneyHref({ slug: createSlug('Estoril'), year: 1995 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Estoril</Link>, <Link href={getTourneyHref({ slug: createSlug('St. Pölten'), year: 1995 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">St. Pölten</Link>, <Link href={getTourneyHref({ slug: 'stuttgart-outdoor', year: 1995 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Stuttgart Outdoor</Link>, <Link href={getTourneyHref({ slug: createSlug('San Marino'), year: 1995 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">San Marino</Link>, <Link href={getTourneyHref({ slug: createSlug('Umag'), year: 1995 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Umag</Link> and <Link href={getTourneyHref({ slug: 'bucharest-2', year: 1995 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Bucharest</Link>. Muster's season breakdown records 12 total titles in 1995: 11 on clay and 1 on carpet.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" />Rafael Nadal</span> produced the strongest teenage version of this record chase in 2005. At just 19, he won <strong className="!text-amber-300">8 clay-court titles</strong> in one season: <Link href={getTourneyHref({ slug: createSlug('Costa do Sauipe'), year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Costa do Sauipe</Link>, <Link href={getTourneyHref({ slug: createSlug('Acapulco'), year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Acapulco</Link>, <Link href={getTourneyHref({ slug: 'monte-carlo-masters', year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte Carlo</Link>, <Link href={getTourneyHref({ slug: createSlug('Barcelona'), year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Barcelona</Link>, <Link href={getTourneyHref({ slug: 'rome-masters', year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome</Link>, <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link>, <Link href={getTourneyHref({ slug: createSlug('Bastad'), year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Bastad</Link> and <Link href={getTourneyHref({ slug: createSlug('Stuttgart'), year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Stuttgart</Link>. Nadal's year-by-surface breakdown shows 11 total titles in 2005, 8 of them on clay.
          </p>
          <p>
            That is why Vilas's 1977 record still feels almost unreachable. Fourteen clay-court titles in a single season is not just a measure of surface dominance. It is a measure of schedule density, physical resistance and the ability to keep winning finals on the most demanding surface in tennis. Muster came close, Nadal created the modern gold standard, but Vilas remains alone at the top.
          </p>
        </div>
      )}

      {isMostCarpetCourtTitlesInSingleSeason && topCarpetCourtTitlesSeason && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            Most Carpet Court Titles in a Single Season reaches its Open Era benchmark with <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><Link href="/players/ivan-lendl" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Ivan Lendl</Link></span>, whose <strong className="!text-sky-300">1982</strong> season remains the reference point for carpet dominance by volume. His <strong className="!text-amber-300">9 titles</strong> were built across the full indoor calendar, combining the most prestigious events with a dense run of WCT tournaments. He won the <Link href="/tournaments/genoa-wct/1982" className="!text-orange-300 hover:!text-orange-100 font-semibold">Genoa WCT</Link>, <Link href="/tournaments/munich-wct/1982" className="!text-orange-300 hover:!text-orange-100 font-semibold">Munich WCT</Link>, <Link href="/tournaments/strasbourg-wct/1982" className="!text-orange-300 hover:!text-orange-100 font-semibold">Strasbourg WCT</Link>, <Link href="/tournaments/ostrava/1982" className="!text-orange-300 hover:!text-orange-100 font-semibold">Frankfurt WCT</Link>, the <Link href="/tournaments/wct-finals/1982" className="!text-orange-300 hover:!text-orange-100 font-semibold">WCT Finals in Dallas</Link>, <Link href="/tournaments/los-angeles-wct/1982" className="!text-orange-300 hover:!text-orange-100 font-semibold">Los Angeles WCT</Link>, <Link href="/tournaments/naples-wct/1982" className="!text-orange-300 hover:!text-orange-100 font-semibold">Naples WCT</Link>, <Link href="/tournaments/hartford-wct/1982" className="!text-orange-300 hover:!text-orange-100 font-semibold">Hartford WCT</Link> and the <Link href="/tournaments/atp-finals/1982" className="!text-orange-300 hover:!text-orange-100 font-semibold">Masters in New York</Link>. The defining element of his season was continuity: rather than focusing only on major events, Lendl repeatedly succeeded week after week across the carpet circuit.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href="/players/arthur-ashe" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Arthur Ashe</Link></span>'s <strong className="!text-sky-300">1975</strong> campaign took shape within the WCT structure, which was played predominantly on indoor carpet. He won <strong className="!text-amber-300">7 titles</strong> that season: <Link href="/tournaments/barcelona-wct/1975" className="!text-orange-300 hover:!text-orange-100 font-semibold">Barcelona WCT</Link>, <Link href="/tournaments/rotterdam/1975" className="!text-orange-300 hover:!text-orange-100 font-semibold">Rotterdam WCT</Link>, <Link href="/tournaments/munich-wct/1975" className="!text-orange-300 hover:!text-orange-100 font-semibold">Munich WCT</Link>, <Link href="/tournaments/stockholm-wct/1975" className="!text-orange-300 hover:!text-orange-100 font-semibold">Stockholm WCT</Link>, the <Link href="/tournaments/wct-finals/1975" className="!text-orange-300 hover:!text-orange-100 font-semibold">WCT Finals in Dallas</Link>, <Link href="/tournaments/los-angeles/1975" className="!text-orange-300 hover:!text-orange-100 font-semibold">Los Angeles</Link> and <Link href="/tournaments/dallas-2/1975" className="!text-orange-300 hover:!text-orange-100 font-semibold">San Francisco</Link>. In this context, his results reflect control of the most important tournaments on the circuit, even if the calendar itself was less unified than in later eras.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href="/players/stan-smith" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Stan Smith</Link></span> had already reached the same <strong className="!text-amber-300">7-title</strong> carpet level in <strong className="!text-sky-300">1973</strong>, during another WCT-heavy season. His run included <Link href="/tournaments/philadelphia/1973" className="!text-orange-300 hover:!text-orange-100 font-semibold">Philadelphia WCT</Link>, <Link href="/tournaments/atlanta-2/1973" className="!text-orange-300 hover:!text-orange-100 font-semibold">Atlanta WCT</Link>, <Link href="/tournaments/st-louis-wct/1973" className="!text-orange-300 hover:!text-orange-100 font-semibold">St. Louis WCT</Link>, <Link href="/tournaments/munich-wct/1973" className="!text-orange-300 hover:!text-orange-100 font-semibold">Munich WCT</Link>, <Link href="/tournaments/brussels/1973" className="!text-orange-300 hover:!text-orange-100 font-semibold">Brussels WCT</Link>, <Link href="/tournaments/gothenburg-wct/1973" className="!text-orange-300 hover:!text-orange-100 font-semibold">Gothenburg WCT</Link> and the <Link href="/tournaments/wct-finals/1973" className="!text-orange-300 hover:!text-orange-100 font-semibold">WCT Finals in Dallas</Link>. That season shows how much of the early-1970s indoor calendar was built around WCT events, with carpet acting as the main stage for week-to-week title accumulation.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href="/players/john-mcenroe" className="!text-cyan-300 hover:!text-cyan-100 font-semibold">John McEnroe</Link></span>'s <strong className="!text-sky-300">1984</strong> season, by contrast, was defined by concentration of success in the top indoor events. He won <strong className="!text-amber-300">7 carpet titles</strong>: <Link href="/tournaments/philadelphia/1984" className="!text-orange-300 hover:!text-orange-100 font-semibold">U.S. Pro Indoor in Philadelphia</Link>, <Link href="/tournaments/richmond-wct/1984" className="!text-orange-300 hover:!text-orange-100 font-semibold">Richmond WCT</Link>, <Link href="/tournaments/madrid/1984" className="!text-orange-300 hover:!text-orange-100 font-semibold">Madrid</Link>, <Link href="/tournaments/brussels/1984" className="!text-orange-300 hover:!text-orange-100 font-semibold">Brussels</Link>, the <Link href="/tournaments/wct-finals/1984" className="!text-orange-300 hover:!text-orange-100 font-semibold">WCT Finals in Dallas</Link>, <Link href="/tournaments/dallas-2/1984" className="!text-orange-300 hover:!text-orange-100 font-semibold">San Francisco</Link> and the <Link href="/tournaments/atp-finals/1984" className="!text-orange-300 hover:!text-orange-100 font-semibold">Masters in New York</Link>. Compared to Lendl, his schedule was more selective, but his victories were clustered in the highest-level tournaments, highlighting a form of dominance built on quality rather than volume.
          </p>
        </div>
      )}

      {isMostGrassCourtTitlesInSingleSeason && topGrassCourtTitlesSeason && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            Most Grass Court Titles in a Single Season reaches its Open Era benchmark with <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" />Arthur Ashe</span>, whose 1968 season remains the grass-court benchmark. Ashe won <strong className="!text-amber-300">5 grass-court titles</strong> that year, setting a record that has never been surpassed. In 1968, grass was still central to the calendar: the <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 1968 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link> was at Forest Hills, the Australian circuit was grass-based, and grass occupied a much larger part of the season. Ashe turned that first year of Open tennis into one of the most important grass-court campaigns in the sport's history.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="GEO" className="w-4 h-3" />Alex Metreveli</span>, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" />Jimmy Connors</span>, and <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" />Rod Laver</span>, who each reached <strong className="!text-amber-300">4 grass-court titles</strong>. Metreveli won 4 in 1972 when grass was spread across multiple events. Connors matched this in 1974 using three Grand Slams on grass. Laver reached 4 in 1969, his <strong className="!text-emerald-300">Calendar Grand Slam</strong> year, when three majors were played on grass. But Ashe remains alone at the top.
          </p>
          <p>
            That is why Ashe's 1968 record still stands apart. Five grass-court titles in one season is not only a measure of surface dominance; it is also a record shaped by a vanished calendar. Metreveli, Connors and Laver all reached four, each in a very different way, but Ashe remains alone at the top — the player who turned the first year of Open tennis into the greatest single-season grass-court title haul ever recorded.
          </p>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowModalTitles(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {renderTable(currentData, start)}

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}

      <Modal
        show={showModalTitles}
        onClose={() => setShowModalTitles(false)}
        title="Top Titles in a Single Season"
      >
        {renderTable(topSeasonTitles)}
      </Modal>
    </section>
  );
}
