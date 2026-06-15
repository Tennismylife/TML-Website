'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Flag from '@/components/Flag';
import { getPlayerHref, getTourneyHref } from "@/lib/utils";
import { playerSurfaceOrMatchesUrl } from "../nav";
import { useSearchParams } from 'next/navigation';
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';

function formatDays(days: number): string {
  const years = Math.floor(days / 365);
  const rem = days % 365;
  return years > 0 ? `${years}y ${rem}d` : `${rem}d`;
}

interface TimespanEntry {
  player_id: string;
  player_name: string;
  ioc?: string | null;
  overall_timespan?: any[];
  surface_timespan?: any[];
  level_timespan?: any[];
}

interface EntriesSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  description?: string;
  initialData?: TimespanEntry[];
}

export default function EntriesSection({ selectedSurfaces, selectedLevels, fetchEnabled, fetchRequestId, description, initialData }: EntriesSectionProps & { fetchEnabled?: boolean, fetchRequestId?: string | null, description?: string, initialData?: TimespanEntry[] }) {
  const enabled = !!fetchEnabled;
  const [entries, setEntries] = useState<TimespanEntry[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const perPage = 20;
  const searchParams = useSearchParams();

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels]);

  useEffect(() => {
    const fetchData = async () => {
      // Trigger client fetch on mount when server provided `initialData`
      // so SSR top‑10 is replaced by the client's `perPage=100` result.
      // Also fetch when SSR prefetch is enabled but the server did not return any initial data,
      // otherwise the page can incorrectly show "No data available." before client fetch occurs.
      const shouldFetch = showModal || (enabled && fetchRequestId) || initialData !== undefined;
      if (!shouldFetch) {
        if (Array.isArray(initialData)) setEntries(initialData);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('level', l));
        query.set('perPage', showModal ? '1000' : '100');
        const url = `/api/records/timespan/entries?${query.toString()}`;
        // fetching entries: url, fetchRequestId omitted from logs
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch entries');
        const data = await res.json();
        setEntries(data);
      } catch (err) {
        console.error(err);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, enabled, fetchRequestId, showModal, initialData]);

  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!entries.length) return <div className="text-center py-8 text-gray-300">No data available.</div>;

  const totalPages = Math.ceil(entries.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = entries.slice(start, start + perPage);



  const getTimespans = (entry: TimespanEntry) => {
    if (selectedSurfaces.size > 0) return entry.surface_timespan ?? [];
    if (selectedLevels.size > 0) return entry.level_timespan ?? [];
    return entry.overall_timespan ?? [];
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toISOString().slice(0, 10);

  const renderTable = (data: TimespanEntry[], startIndex = 0) => (
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
          {data.map((entry, idx) => {
            const globalRank = startIndex + idx + 1;
            const timespans = getTimespans(entry);

            return timespans.map((ts, tsIdx) => (
              <tr key={`${entry.player_id}-${tsIdx}`} className="hover:bg-gray-800 border-b border-gray-800">
                {tsIdx === 0 && (
                  <>
                    <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300 font-medium" rowSpan={timespans.length}>{globalRank}</td>
                    <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-200 flex items-center justify-center gap-2 font-medium" rowSpan={timespans.length}>
                      <Flag ioc={entry.ioc ?? undefined} className="w-4 h-3 inline-block" />
                      <Link href={playerSurfaceOrMatchesUrl((entry as any).slug ?? String(entry.player_id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="text-gray-300 hover:underline">{entry.player_name}</Link>
                    </td>
                  </>
                )}
                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-200">{ts.first_tourney_name}</td>
                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-200">{formatDate(ts.first_tourney_date)}</td>
                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-200">{ts.last_tourney_name}</td>
                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-200">{formatDate(ts.last_tourney_date)}</td>
                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300 font-medium">{ts.days_between}d <span className="text-base font-normal" style={{color:'#facc15'}}>({formatDays(ts.days_between)})</span></td>
              </tr>
            ));
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

      {description === 'Longest Appearance Timespan' && selectedLevels?.size === 0 && selectedSurfaces?.size === 0 && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the list for Longest Appearance Timespan stands <span className="inline-flex items-center gap-2"><Flag ioc="AUT" className="w-4 h-3" /><span>Thomas Muster</span></span>, whose tour-level main-draw span runs from <Link href={getTourneyHref({ slug: 'kitzbuhel', year: 1984 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Kitzbühel 1984</Link> to <Link href={getTourneyHref({ slug: 'vienna', year: 2011 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Vienna 2011</Link> — a gap of <strong className="!text-amber-300">9,954 days</strong>, listed as <strong className="!text-amber-300">27 years and 99 days</strong>.
          </p>
          <p>
            Muster’s first top-level appearances came in 1984, when he was still a junior, including the clay-court event in <Link href={getTourneyHref({ slug: 'kitzbuhel', year: 1984 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Kitzbühel 1984</Link> and the indoor event in <Link href={getTourneyHref({ slug: 'vienna', year: 2011 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Vienna</Link>; the <Link href={getTourneyHref({ slug: 'kitzbuhel', year: 1984 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Kitzbühel 1984</Link> draw records him in the main draw, beating <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jeff Borowiak</span></span> before losing to <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Henri Leconte</span></span>. His final ATP-level appearance came at <Link href={getTourneyHref({ slug: 'vienna', year: 2011 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Vienna 2011</Link>, where he lost to fellow Austrian <span className="inline-flex items-center gap-2"><Flag ioc="AUT" className="w-4 h-3" /><span>Dominic Thiem</span></span> 6-2, 6-3
          </p>
          <p>
            Behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>, whose span from <Link href={getTourneyHref({ slug: 'boston-2', year: 1969 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Boston-2 1969</Link> to <Link href={getTourneyHref({ slug: 'atlanta', year: 1996 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Atlanta 1996</Link> covers <strong className="!text-amber-300">9,753 days</strong>, or <strong className="!text-amber-300">26 years and 263 days</strong> by the same record format. Connors is the more “continuous elite-career” version of the record: ATP lists his last singles ATP appearance at <Link href={getTourneyHref({ slug: 'atlanta', year: 1996 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Atlanta 1996</Link>, where he lost to <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Richey Reneberg</span></span> in the opening round, while his career totals remain historic.
          </p>
          <p>
            Other major longevity markers include <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Feliciano Lopez</span></span>, from <Link href={getTourneyHref({ slug: 'barcelona', year: 1998 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Barcelona 1998</Link> to <Link href={getTourneyHref({ slug: 'mallorca', year: 2023 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Mallorca 2023</Link> at <strong className="!text-amber-300">25 years and 80 days</strong>; <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Guillermo Vilas</span></span>, from <Link href={getTourneyHref({ slug: 'buenos-aires-2', year: 1968 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Buenos Aires-2 1968</Link> to <Link href={getTourneyHref({ slug: 'bordeaux', year: 1992 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Bordeaux 1992</Link> at <strong className="!text-amber-300">23 years and 320 days</strong>; and <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Richard Gasquet</span></span>, from <Link href={getTourneyHref({ slug: 'monte-carlo-masters', year: 2002 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo 2002</Link> to <Link href={getTourneyHref({ slug: 'roland-garros', year: 2025 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2025</Link> at <strong className="!text-amber-300">23 years and 47 days</strong>. Close behind are <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, whose span from <Link href={getTourneyHref({ slug: 'gstaad', year: 1998 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Gstaad 1998</Link> to <Link href={getTourneyHref({ slug: 'wimbledon', year: 2021 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2021</Link> reached <strong className="!text-amber-300">22 years and 363 days</strong>; <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Stan Wawrinka</span></span> at <strong className="!text-amber-300">22 years and 237 days</strong>; and <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> at <strong className="!text-amber-300">22 years and 97 days</strong>.
          </p>
          <p>
            In this record, the milestone is not titles, finals or ranking peaks, but simply the distance between a player’s first and last recorded tour-level appearance: Muster set the extreme ceiling at more than 27 years, Connors represents the classic Open Era endurance benchmark, while Federer, Nadal, Gasquet and Wawrinka define the modern version of career longevity across multiple generations of the tour.
          </p>
        </div>
      )}

      {description === 'Longest Appearance Timespan at Grand Slams' && selectedLevels?.has('G') && selectedSurfaces?.size === 0 && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the list for Longest Appearance Timespan at Grand Slams stands <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Richard Gasquet</span></span>, whose men’s singles Grand Slam main-draw span runs from <Link href={getTourneyHref({ slug: 'roland-garros', year: 2002 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2002</Link> to <Link href={getTourneyHref({ slug: 'roland-garros', year: 2025 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2025</Link> — roughly <strong className="!text-amber-300">8,400 days</strong>, or <strong className="!text-amber-300">22 years, 11 months and 29 days</strong>. Gasquet made his Grand Slam main-draw debut at <Link href={getTourneyHref({ slug: 'roland-garros', year: 2002 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2002</Link> as a 15-year-old wildcard against <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Albert Costa</span></span>, losing 3-6, 6-0, 6-4, 6-3; the same tournament was played from 27 May to 9 June 2002.
          </p>
          <p>
            His final Grand Slam came at <Link href={getTourneyHref({ slug: 'roland-garros', year: 2025 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2025</Link>, his last professional tournament. Gasquet opened by beating <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Terence Atmane</span></span> 6-2, 2-6, 6-3, 6-0 on 26 May 2025, then ended his career in the second round against <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" /><span>Jannik Sinner</span></span>, losing 6-3, 6-0, 6-4 on Court Philippe-Chatrier. That makes his Slam career arc unusually symmetrical: a Roland Garros debut in 2002, a Roland Garros farewell in 2025, and a span just one day short of 23 full years.
          </p>
          <p>
            Behind him, the key benchmark is <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, whose Grand Slam main-draw span ran from <Link href={getTourneyHref({ slug: 'roland-garros', year: 1999 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 1999</Link> to <Link href={getTourneyHref({ slug: 'wimbledon', year: 2021 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2021</Link>. Federer made his major debut in Paris on 25 May 1999, losing to <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Patrick Rafter</span></span> 5-7, 6-3, 6-0, 6-2, and his last Grand Slam appearance came at <Link href={getTourneyHref({ slug: 'wimbledon', year: 2021 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2021</Link>, where he reached the quarterfinals. That span is 22 years and 41 days, making Federer one of the longest-lasting Grand Slam main-draw players ever, even before considering his record-equalling 81 total major appearances.
          </p>
          <p>
            Another classic longevity reference is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>, whose Grand Slam appearances in this database run from the <Link href={getTourneyHref({ slug: 'us-open', year: 1970 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1970 US Open</Link> to the <Link href={getTourneyHref({ slug: 'us-open', year: 1992 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1992 US Open</Link>. His first recorded Slam match here came against <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><span>Mark Cox</span></span>, and his last Slam match came at the <Link href={getTourneyHref({ slug: 'us-open', year: 1992 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1992 US Open</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Ivan Lendl</span></span> on 31 August 1992. Connors’ case remains the classic Open Era endurance model: not just a long span between appearances, but repeated deep Slam runs across multiple generations.
          </p>
          <p>
            A separate consistency benchmark is <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Feliciano Lopez</span></span>, whose overall Grand Slam span from <Link href={getTourneyHref({ slug: 'roland-garros', year: 2001 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2001</Link> to <Link href={getTourneyHref({ slug: 'wimbledon', year: 2022 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2022</Link> is shorter than Gasquet’s, but whose record is built on continuity: Guinness credits him with 79 consecutive Grand Slam main-draw appearances, from <Link href={getTourneyHref({ slug: 'roland-garros', year: 2002 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2002</Link> to the <Link href={getTourneyHref({ slug: 'australian-open', year: 2022 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2022 Australian Open</Link>, before he later made <Link href={getTourneyHref({ slug: 'wimbledon', year: 2022 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2022</Link> to reach 81 total Grand Slam appearances.
          </p>
          <p>
            In this record, the milestone is not peak performance, titles or even consecutive participation, but the distance between a player’s first and last Grand Slam main-draw appearance: Gasquet set the modern ceiling at almost 23 years, Federer represents the all-time-great version of extreme Slam longevity, Connors the classic Open Era bridge across generations, and Lopez the consecutive-appearance specialist.
          </p>
        </div>
      )}

      {description === 'Longest Appearance Timespan at Masters 1000' && selectedLevels?.has('M') && selectedSurfaces?.size === 0 && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the list for Longest Appearance Timespan at Masters 1000 stands <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Richard Gasquet</span></span>, whose Masters 1000 main-draw span runs from <Link href={getTourneyHref({ slug: 'monte-carlo-masters', year: 2002 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo 2002</Link> to <Link href={getTourneyHref({ slug: 'monte-carlo-masters', year: 2025 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo 2025</Link> — <strong className="!text-amber-300">22 years and 363 days</strong>, the longest recorded gap between a player’s first and last Masters 1000 appearance. The category formally begins with the Masters 1000 series in 1990. Gasquet’s first Masters 1000 appearance came at <Link href={getTourneyHref({ slug: 'monte-carlo-masters', year: 2002 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo 2002</Link>, when he was 15 years old and made his Masters-level debut before going on to beat <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" /><span>Matteo Arnaldi</span></span> and later lose to <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Daniel Altmaier</span></span> in his final Masters appearance at <Link href={getTourneyHref({ slug: 'monte-carlo-masters', year: 2025 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo 2025</Link>.
          </p>
          <p>
            Behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Gael Monfils</span></span>, whose Masters 1000 span reached <strong className="!text-amber-300">7,843 days</strong>, or <strong className="!text-amber-300">21 years and 173 days</strong>, after his <Link href={getTourneyHref({ slug: 'madrid-masters', year: 2026 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Madrid 2026</Link> appearance. Monfils’ first Masters appearance came at <Link href={getTourneyHref({ slug: 'paris-masters', year: 2004 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Paris 2004</Link>, and by Madrid 2026 he had moved into second place on this longevity list.
          </p>
          <p>
            Other major reference points include <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, whose Masters 1000 span is listed at <strong className="!text-amber-300">21 years and 28 days</strong>; <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Stan Wawrinka</span></span>, at <strong className="!text-amber-300">20 years and 344 days</strong>; and <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, whose Masters 1000 span runs from <Link href={getTourneyHref({ slug: 'cincinnati-masters', year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Cincinnati Masters 2005</Link> to <Link href={getTourneyHref({ slug: 'rome-masters', year: 2026 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome Masters 2026</Link> and covers <strong className="!text-amber-300">7,571 days</strong>, or <strong className="!text-amber-300">20 years and 271 days</strong>.
          </p>
          <p>
            In this record, the milestone is simply the distance between a player’s first and last Masters 1000 main-draw appearance: Gasquet set the extreme ceiling at almost 23 years, Monfils represents the closest active/late-career challenger, while Nadal, Wawrinka and Djokovic define the modern elite version of Masters 1000 longevity across multiple generations.
          </p>
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={(e) => {
            try { e.preventDefault(); e.stopPropagation(); } catch (ex) {}
            // intercept and open modal via intercepted-route at /records/timespan/entries
            try {
              const state = { modal: true, background: window.location.pathname, section: 'timespan', title: null };
              try { (window as any).__lastOpenModalPayload = state; (window as any).__modalBackgroundPath = state.background; } catch (e) {}
              const newPath = `/records/timespan/entries`;
              // attempt SPA navigation if router available
              try {
                const router = (window as any).__NEXT_ROUTER__;
                // if our internal hook/router isn't available, fallback to pushState
              } catch (e) {}
              try { window.history.replaceState(state, '', newPath); } catch (e) {}
              try { window.dispatchEvent(new CustomEvent('open-modal', { detail: state })); } catch (e) {}
            } catch (err) { /* ignore */ }
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {renderTable(currentData, start)}

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}

      <Modal show={showModal} onClose={() => setShowModal(false)} title="Top 100 Timespans">
        {renderTable(entries)}
      </Modal>
    </section>
  );
}
