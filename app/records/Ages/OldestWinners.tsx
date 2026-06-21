'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Flag from '@/components/Flag';
import { getTourneyHref } from "@/lib/utils";
import { playerSurfaceOrMatchesUrl } from "../nav";
import Pagination from "../../../components/Pagination";
import Modal from "@/components/Modal";

interface Player {
  id: number;
  name: string;
  ioc?: string;
  age: number;
  event_id: string;
  tourney_id: string;
  tourney_name: string;
  year: string | number;
}

interface OldestWinnersProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  fetchEnabled?: boolean;
  fetchRequestId?: string | null;
  description?: string;
  initialData?: Player[];
}

const OldestWinners = ({ selectedSurfaces, selectedLevels, fetchEnabled, fetchRequestId, description, initialData }: OldestWinnersProps) => {
  const enabled = !!fetchEnabled;
  const [data, setData] = useState<Player[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const searchParams = useSearchParams();
  const perPage = 20;

  useEffect(() => {
    setPage(1);
  }, [selectedSurfaces, selectedLevels]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      // Always re-fetch on mount when server provided `initialData` so the
      // client replaces SSR top‑10 with the full (limit=100) result set.
      const shouldFetch = showModal || (enabled && fetchRequestId) || (Array.isArray(initialData) && initialData.length > 0);
      if (!shouldFetch) {
        if (Array.isArray(initialData)) setData(initialData);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const query = new URLSearchParams();
        query.append("type", "oldest");
        selectedSurfaces.forEach((s) => query.append("surface", s));
        selectedLevels.forEach((l) => query.append("level", l));
        query.append("limit", showModal ? "1000" : "100");
        const url = `/api/records/ages/winners?${query.toString()}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to fetch oldest winners");
        const fetchedData = await res.json();
        setData(fetchedData.oldestWinners || []);
      } catch (err: any) {
        if (err.name !== "AbortError") console.error(err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [selectedSurfaces, selectedLevels, enabled, showModal, fetchRequestId, initialData]);

  const formatAge = (age: number) => {
    const years = Math.floor(age);
    const days = Math.floor((age - years) * 365.25);
    return `${years}y ${days}d`;
  };



  const renderTable = (playersList: Player[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200 whitespace-nowrap">Age</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Tournament</th>
          </tr>
        </thead>
        <tbody>
          {playersList.map((p, idx) => {
            const globalRank = startIndex + idx + 1;
            const year =
              p.year ||
              (typeof p.tourney_id === "string" ? p.tourney_id.split("-")[1] : "unknown");
            const tourneyId = typeof p.tourney_id === "string" ? p.tourney_id.split("-")[0] : p.tourney_id;

            return (
              <tr key={`${p.id}-${p.event_id}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  <div className="flex items-center justify-center gap-2">
                    <Flag ioc={p.ioc} className="w-4 h-3" />
                    <Link href={playerSurfaceOrMatchesUrl((p as any).slug ?? String(p.id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="text-indigo-300 hover:underline">
                      {p.name}
                    </Link>
                  </div>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{formatAge(p.age)}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  <Link href={getTourneyHref({ slug: (selectedSurfaces?.size === 0 && selectedLevels?.size === 0) ? ((p as any).tourney_slug ?? undefined) : undefined, id: p.tourney_id, name: p.tourney_name, year })} className="text-indigo-300 hover:underline">
                    {p.tourney_name} {year}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (loading)
    return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!data.length)
    return <div className="text-center py-8 text-gray-300">No data available.</div>;

  const totalPages = Math.ceil(data.length / perPage);
  const start = (page - 1) * perPage;
  const currentPlayers = data.slice(start, start + perPage);`r`n  const hasRows = data.length > 0;`r`n
  return (`r`n    <section className="mb-8">`r`n      {loading && !hasRows ? (`r`n        <div className="text-center py-8 text-gray-300">Loading...</div>`r`n      ) : hasRows ? (`r`n        <>`r`n      {description && <h2 className="mb-6 text-center text-2xl font-semibold text-white">{description}</h2>} 

      {selectedLevels?.has('G') && selectedSurfaces?.size === 0 ? (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for Oldest Grand Slam Title Winners stands <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Ken Rosewall</span></span>, who won the <Link href="/tournaments/australian-open/1972" className="!text-orange-300 hover:!text-orange-100 font-semibold">1972 Australian Open</Link> aged <strong className="!text-amber-300">37 years and 62 days</strong> — the oldest recorded men’s singles Grand Slam champion of the Open Era. Rosewall defeated <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Mal Anderson</span></span> in the final at Kooyong, 7-6, 6-3, 7-5, claiming his eighth and final Grand Slam singles title.
          </p>
          <p>
            Rosewall dominates the top of this record: one year earlier, he had also won the <Link href="/tournaments/australian-open/1971" className="!text-orange-300 hover:!text-orange-100 font-semibold">1971 Australian Open</Link> aged <strong className="!text-amber-300">36</strong>, beating <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Arthur Ashe</span></span> 6-1, 7-5, 6-3 without dropping a set throughout the tournament. His 1972 triumph therefore remains the ultimate Grand Slam title-winning longevity milestone — not merely a late-career run, but a successful defence of a major title deep into his late thirties.
          </p>
          <p>
            Behind him, the modern benchmark is <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, who won the <Link href="/tournaments/australian-open/2018" className="!text-orange-300 hover:!text-orange-100 font-semibold">2018 Australian Open</Link> aged <strong className="!text-amber-300">36 years and 5 months</strong>, beating <span className="inline-flex items-center gap-2"><Flag ioc="HRV" className="w-4 h-3" /><span>Marin Cilic</span></span> in five sets to claim his 20th and final Grand Slam singles title. Close behind come <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, champion at the <Link href="/tournaments/us-open/2023" className="!text-orange-300 hover:!text-orange-100 font-semibold">2023 US Open</Link> aged <strong className="!text-amber-300">36 years and 97 days</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, champion at <Link href="/tournaments/roland-garros/2022" className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2022</Link> aged <strong className="!text-amber-300">35 years and 354 days</strong>, where he became the oldest men’s champion in French Open history.
          </p>
        </div>
      ) : selectedLevels?.has('M') && selectedSurfaces?.size === 0 ? (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for Oldest Masters 1000 Title Winners stands <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, who won the <Link href="/tournaments/miami-masters/2019" className="!text-orange-300 hover:!text-orange-100 font-semibold">2019 Miami Open</Link> aged <strong className="!text-amber-300">37 years and 235 days</strong> — the oldest recorded men’s singles champion in ATP Masters 1000 history, with the series formally beginning in 1990. In that final, Federer defeated <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John Isner</span></span> 6-1, 6-4, producing one of the cleanest title-match performances of his late career; ATP described it as Federer’s fourth Miami title, his 101st tour-level title, and his 28th and final Masters 1000 crown.
          </p>
          <p>
            Behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, who won the <Link href="/tournaments/paris-masters/2023" className="!text-orange-300 hover:!text-orange-100 font-semibold">2023 Paris Masters</Link> aged <strong className="!text-amber-300">36 years and 167 days</strong>, beating <span className="inline-flex items-center gap-2"><Flag ioc="BUL" className="w-4 h-3" /><span>Grigor Dimitrov</span></span> 6-4, 6-3 to claim a record-extending 40th Masters 1000 title. Djokovic also appears immediately behind with <Link href="/tournaments/cincinnati-masters/2023" className="!text-orange-300 hover:!text-orange-100 font-semibold">Cincinnati 2023</Link>, won aged <strong className="!text-amber-300">36 years and 90 days</strong>, where he saved championship point and defeated <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Carlos Alcaraz</span></span> 5-7, 7-6(7), 7-6(4) in one of the greatest Masters finals ever.
          </p>
          <p>
            Another major late-career benchmark is <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, who won <Link href="/tournaments/rome-masters/2021" className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome 2021</Link> aged <strong className="!text-amber-300">34 years and 339 days</strong>, defeating Djokovic 7-5, 1-6, 6-3 for his 10th Rome title and 36th Masters 1000 crown. Other older Masters champions include <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span>, winner of <Link href="/tournaments/cincinnati-masters/2004" className="!text-orange-300 hover:!text-orange-100 font-semibold">Cincinnati 2004</Link> aged <strong className="!text-amber-300">34 years and 95 days</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John Isner</span></span>, winner of <Link href="/tournaments/miami-masters/2018" className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 2018</Link> aged <strong className="!text-amber-300">32 years and 327 days</strong>, still the oldest first-time Masters 1000 champion.
          </p>
          <p>
            In this record, the milestone is not simply reaching the final, but actually lifting one of the tour’s biggest non-Slam trophies: Federer set the current Masters 1000 title-winning ceiling at <strong className="!text-amber-300">37 years and 235 days</strong>, Djokovic represents the closest challenger in the post-35 era, and Nadal, Agassi and Isner show how rare it is to win at this level even beyond the early-to-mid thirties.
          </p>
        </div>
      ) : selectedSurfaces?.has('Grass') ? (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            This record tracks the oldest grass-court title winners in the Open Era, focusing on the men who were still able to win on grass at ages that usually mark the final stretch of a career. At the top of the list stands <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Ken Rosewall</span></span>, whose <Link href="/tournaments/brisbane/1972" className="!text-orange-300 hover:!text-orange-100 font-semibold">Brisbane 1972</Link> title came at <strong className="!text-amber-300">38 years and 25 days</strong>.
          </p>
          <p>
            Rosewall is the only player in this ranking to win a tour-level grass title after turning 38, and he appears again immediately behind himself with <Link href="/tournaments/australian-open/1972" className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 1972</Link> at <strong className="!text-amber-300">37 years and 55 days</strong>, followed by <Link href="/tournaments/newport/1971" className="!text-orange-300 hover:!text-orange-100 font-semibold">Newport 1971</Link> at <strong className="!text-amber-300">36 years and 243 days</strong> and <Link href="/tournaments/australian-open/1971" className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 1971</Link> at <strong className="!text-amber-300">36 years and 172 days</strong>.
          </p>
          <p>
            Behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, who won <Link href="/tournaments/halle/2019" className="!text-orange-300 hover:!text-orange-100 font-semibold">Halle 2019</Link> at <strong className="!text-amber-300">37 years and 312 days</strong>. Federer beat <span className="inline-flex items-center gap-2"><Flag ioc="BEL" className="w-4 h-3" /><span>David Goffin</span></span> in the final to collect his 10th Halle title, his 19th grass-court title and his final ATP title on the surface.
          </p>
          <p>
            The next two names show how concentrated the record is around a small cluster of exceptional careers. <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Mal Anderson</span></span> won <Link href="/tournaments/sydney-1/1973" className="!text-orange-300 hover:!text-orange-100 font-semibold">Sydney-1 1973</Link> at <strong className="!text-amber-300">37 years and 304 days</strong>, then <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Feliciano López</span></span> took <Link href="/tournaments/queens-club/2019" className="!text-orange-300 hover:!text-orange-100 font-semibold">Queen's Club 2019</Link> at <strong className="!text-amber-300">37 years and 269 days</strong>.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="HRV" className="w-4 h-3" /><span>Ivo Karlović</span></span> rounds out the top five with <Link href="/tournaments/newport/2016" className="!text-orange-300 hover:!text-orange-100 font-semibold">Newport 2016</Link> at <strong className="!text-amber-300">37 years and 133 days</strong>. Just outside that group, Rosewall returns with <Link href="/tournaments/brisbane/1971" className="!text-orange-300 hover:!text-orange-100 font-semibold">Brisbane 1971</Link> at <strong className="!text-amber-300">36 years and 284 days</strong>, and then again with <Link href="/tournaments/australian-open/1970" className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 1970</Link> at <strong className="!text-amber-300">36 years and 233 days</strong>.
          </p>
          <p>
            The record number is still <strong className="!text-amber-300">38 years and 25 days</strong>: Ken Rosewall's <Link href="/tournaments/brisbane/1972" className="!text-orange-300 hover:!text-orange-100 font-semibold">Brisbane 1972</Link> title remains the oldest ATP grass-court title-winning performance in the Open Era, and the top five are Rosewall <strong className="!text-amber-300">38y 25d</strong>, Federer <strong className="!text-amber-300">37y 312d</strong>, Anderson <strong className="!text-amber-300">37y 304d</strong>, López <strong className="!text-amber-300">37y 269d</strong> and Karlović <strong className="!text-amber-300">37y 133d</strong>.
          </p>
        </div>
      ) : selectedSurfaces?.has('Clay') ? (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            This record tracks the oldest clay-court title winners in the Open Era, focusing on the men’s singles champions who won on clay court at the oldest ages and set the standard for longevity on one of tennis’s most demanding surfaces.
          </p>
          <p>
            At the summit sits <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Ken Rosewall</span></span>, who owns the highest age in the record with <Link href="/tournaments/gstaad/1975" className="!text-orange-300 hover:!text-orange-100 font-semibold">Gstaad 1975</Link> at <strong className="!text-amber-300">40 years and 246 days</strong>. He is not a one-off at the top of the ranking: the next three lines are also his, with <Link href="/tournaments/houston/1975" className="!text-orange-300 hover:!text-orange-100 font-semibold">Houston WCT 1975</Link> at <strong className="!text-amber-300">40 years and 169 days</strong>, then <Link href="/tournaments/tokyo/1973" className="!text-orange-300 hover:!text-orange-100 font-semibold">Tokyo 1973</Link> at <strong className="!text-amber-300">38 years and 340 days</strong> and <Link href="/tournaments/osaka/1973" className="!text-orange-300 hover:!text-orange-100 font-semibold">Osaka 1973</Link> at <strong className="!text-amber-300">38 years and 334 days</strong>.
          </p>
          <p>
            The only player who comes close to challenging that veteran ceiling with any consistency is <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>. His clay title age line includes <Link href="/tournaments/geneva/2025" className="!text-orange-300 hover:!text-orange-100 font-semibold">Geneva 2025</Link> at <strong className="!text-amber-300">37 years and 362 days</strong>, <Link href="/tournaments/paris-olympics/2024" className="!text-orange-300 hover:!text-orange-100 font-semibold">Paris Olympics 2024</Link> at <strong className="!text-amber-300">37 years and 68 days</strong>, and <Link href="/tournaments/roland-garros/2023" className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2023</Link> at <strong className="!text-amber-300">36 years and 6 days</strong>, proving that the modern record still has a clear second pillar.
          </p>
          <p>
            Beyond those two, the rest of the top 20 shows how unusual the record is. <span className="inline-flex items-center gap-2"><Flag ioc="DOM" className="w-4 h-3" /><span>Victor Estrella Burgos</span></span> reached <Link href="/tournaments/quito/2017" className="!text-orange-300 hover:!text-orange-100 font-semibold">Quito 2017</Link> at <strong className="!text-amber-300">36 years and 188 days</strong>; <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Rod Laver</span></span> won <Link href="/tournaments/san-juan-wct/1975" className="!text-orange-300 hover:!text-orange-100 font-semibold">San Juan WCT 1975</Link> at <strong className="!text-amber-300">36 years and 157 days</strong>; <span className="inline-flex items-center gap-2"><Flag ioc="CRO" className="w-4 h-3" /><span>Nikola Pilić</span></span> took <Link href="/tournaments/aviles/1975" className="!text-orange-300 hover:!text-orange-100 font-semibold">Aviles 1975</Link> at <strong className="!text-amber-300">36 years and 32 days</strong>; and <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> appears later with <Link href="/tournaments/roland-garros/2022" className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2022</Link> at <strong className="!text-amber-300">35 years and 354 days</strong>. In this record, clay longevity is not a single-name story: it is Rosewall at the ceiling, Djokovic as the modern exception, and a long tail of champions whose clay titles still clustered well into their mid-to-late thirties.
          </p>
        </div>
      ) : selectedSurfaces?.has('Carpet') ? (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for Oldest Carpet-Court Title Winners stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pancho Gonzales</span></span>, who won <Link href="/tournaments/des-moines/1972" className="!text-orange-300 hover:!text-orange-100 font-semibold">Des Moines 1972</Link> aged <strong className="!text-amber-300">43 years and 268 days</strong> — the oldest recorded men's singles tour-level title on carpet. TennisMyLife lists Gonzales at No. 1 for carpet-court title winners, while the 1972 Des Moines event is recorded as an indoor carpet tournament.
          </p>
          <p>
            In that final, Gonzales came back from two sets down to defeat <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Georges Goven</span></span> 3-6, 4-6, 6-3, 6-4, 6-2, making <Link href="/tournaments/des-moines/1972" className="!text-orange-300 hover:!text-orange-100 font-semibold">Des Moines 1972</Link> one of the most extreme title-winning longevity records of the Open Era. The tournament was held indoors at the Veterans Memorial Auditorium in Des Moines and belonged to the early-1970s USLTA indoor circuit.
          </p>
          <p>
            Behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Ken Rosewall</span></span>, another great longevity outlier, who won <Link href="/tournaments/jackson/1976" className="!text-orange-300 hover:!text-orange-100 font-semibold">Jackson WCT 1976</Link> aged <strong className="!text-amber-300">41 years and 135 days</strong>, followed by <Link href="/tournaments/jackson/1975" className="!text-orange-300 hover:!text-orange-100 font-semibold">Jackson 1975</Link> aged <strong className="!text-amber-300">40 years and 143 days</strong>. Gonzales also appears again near the top with <Link href="/tournaments/los-angeles/1968" className="!text-orange-300 hover:!text-orange-100 font-semibold">Los Angeles NTL 1968</Link>, aged <strong className="!text-amber-300">40 years and 69 days</strong>.
          </p>
          <p>
            A separate carpet-specific reference point is the ATP Finals/WCT indoor tradition: Rosewall won the <Link href="/tournaments/wct-finals/1972" className="!text-orange-300 hover:!text-orange-100 font-semibold">WCT Finals 1972</Link> on carpet aged <strong className="!text-amber-300">37 years and 187 days</strong>, while the ATP Finals carpet list is topped by <span className="inline-flex items-center gap-2"><Flag ioc="ROU" className="w-4 h-3" /><span>Ilie Nastase</span></span>, who won the <Link href="/tournaments/masters/1975" className="!text-orange-300 hover:!text-orange-100 font-semibold">Masters 1975</Link> aged <strong className="!text-amber-300">29 years and 133 days</strong>.
          </p>
          <p>
            Unlike hard, clay or grass records, this one is effectively frozen: carpet courts disappeared from the ATP Tour after 2008, with the ATP ending their use from 2009 to standardize indoor tournaments on hard courts.
          </p>
          <p>
            In this record, the milestone is not simply surviving on a fast indoor surface, but actually lifting the trophy on carpet: Gonzales set the carpet-court ceiling at 43, Rosewall represents the other great early Open Era benchmark, and the record remains almost untouchable because carpet no longer exists at ATP Tour level.
          </p>
        </div>
      ) : selectedSurfaces?.has('Hard') ? (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            Hard courts provide the clearest stage for the Open Era's oldest title winners, and the benchmark belongs to <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pancho Gonzales</span></span>, who captured <Link href="/tournaments/kingston/1972" className="!text-orange-300 hover:!text-orange-100 font-semibold">Kingston 1972</Link> aged <strong className="!text-amber-300">44 years and 218 days</strong> — the oldest recorded men's singles tour-level title winner of the Open Era. He closed out <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Clark Graebner</span></span> 6-3, 6-4 in that final, giving Kingston 1972 a place at the very top of the hard-court longevity table.
          </p>
          <p>
            Gonzales was not a one-off outlier. He also shows up at <Link href="/tournaments/des-moines/1972" className="!text-orange-300 hover:!text-orange-100 font-semibold">Des Moines 1972</Link> aged <strong className="!text-amber-300">43 years and 268 days</strong>, <Link href="/tournaments/kingston/1971" className="!text-orange-300 hover:!text-orange-100 font-semibold">Kingston 1971</Link> aged <strong className="!text-amber-300">43 years and 217 days</strong>, and <Link href="/tournaments/los-angeles/1971" className="!text-orange-300 hover:!text-orange-100 font-semibold">Los Angeles 1971</Link> aged <strong className="!text-amber-300">43 years and 133 days</strong>. The story here is not just late participation, but repeated success: even in his forties, he was still closing tournaments as champion.
          </p>
          <p>
            The next great hard-court reference point is <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Ken Rosewall</span></span>, who won <Link href="/tournaments/hong-kong/1977" className="!text-orange-300 hover:!text-orange-100 font-semibold">Hong Kong 1977</Link> aged <strong className="!text-amber-300">43 years and 5 days</strong> after beating <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Tom Gorman</span></span> 6-3, 5-7, 6-4, 6-4. He had already taken the same title the year before at <strong className="!text-amber-300">42 years and 6 days</strong>, which is why Rosewall and Gonzales occupy the uppermost tier of this surface-specific ranking.
          </p>
          <p>
            For the modern ATP Tour era, <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span> sets the contemporary standard. He won <Link href="/tournaments/athens/2025" className="!text-orange-300 hover:!text-orange-100 font-semibold">Athens 2025</Link> aged <strong className="!text-amber-300">38 years and 5 months</strong>, defeating <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" /><span>Lorenzo Musetti</span></span> 4-6, 6-3, 7-5 for title No. 101. That victory moved him beyond the previous modern marks set by <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Gael Monfils</span></span> at <Link href="/tournaments/auckland/2025" className="!text-orange-300 hover:!text-orange-100 font-semibold">Auckland 2025</Link> and <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span> at <Link href="/tournaments/basel/2019" className="!text-orange-300 hover:!text-orange-100 font-semibold">Basel 2019</Link>.
          </p>
          <p>
            In other words, this record is about more than longevity alone: it tracks the players who stayed sharp enough to finish the job on hard courts long after their peak years. Gonzales supplies the Open Era ceiling at 44, Rosewall is the other great pre-modern benchmark, and Djokovic shows how that same standard looks in the modern ATP Tour era.
          </p>
        </div>
      ) : (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for Oldest ATP Title Winners stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pancho Gonzales</span></span>, who won <Link href="/tournaments/kingston/1972" className="!text-orange-300 hover:!text-orange-100 font-semibold">Kingston 1972</Link> aged <strong className="!text-amber-300">44 years and 218 days</strong> — the oldest recorded men’s singles tour-level title winner of the Open Era. In that final, Gonzales defeated <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Clark Graebner</span></span> 6-3, 6-4 on hard court, turning Kingston 1972 into the ultimate title-winning longevity milestone rather than just another late-career run. 
          </p>
          <p>
            Gonzales dominates the very top of this record: he also appears at <Link href="/tournaments/des-moines/1972" className="!text-orange-300 hover:!text-orange-100 font-semibold">Des Moines 1972</Link> aged <strong className="!text-amber-300">43 years and 268 days</strong>, <Link href="/tournaments/kingston/1971" className="!text-orange-300 hover:!text-orange-100 font-semibold">Kingston 1971</Link> aged <strong className="!text-amber-300">43 years and 217 days</strong>, and <Link href="/tournaments/los-angeles/1971" className="!text-orange-300 hover:!text-orange-100 font-semibold">Los Angeles 1971</Link> aged <strong className="!text-amber-300">43 years and 133 days</strong>. His case is extraordinary because he was not merely entering draws deep into his forties — he was still finishing tournaments as champion, decades after first becoming a major force in tennis.
          </p>
          <p>
            Behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Ken Rosewall</span></span>, another all-time longevity outlier, who won <Link href="/tournaments/hong-kong/1977" className="!text-orange-300 hover:!text-orange-100 font-semibold">Hong Kong 1977</Link> aged <strong className="!text-amber-300">43 years and 5 days</strong>, defeating <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Tom Gorman</span></span> 6-3, 5-7, 6-4, 6-4. Rosewall had already won Hong Kong the previous year at <strong className="!text-amber-300">42 years and 6 days</strong>, making him, together with Gonzales, the defining figure at the very top of the oldest-title-winner list.
          </p>
          <p>
            A separate modern reference point is <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>. In the strict ATP Tour era, which begins in 1990, Djokovic became the oldest ATP Tour champion by winning <Link href="/tournaments/athens/2025" className="!text-orange-300 hover:!text-orange-100 font-semibold">Athens 2025</Link> aged <strong className="!text-amber-300">38 years and 5 months</strong>, defeating <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" /><span>Lorenzo Musetti</span></span> 4-6, 6-3, 7-5 for his 101st career title. That result pushed him beyond the previous modern marks set by <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Gael Monfils</span></span> at <Link href="/tournaments/auckland/2025" className="!text-orange-300 hover:!text-orange-100 font-semibold">Auckland 2025</Link> and <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span> at <Link href="/tournaments/basel/2019" className="!text-orange-300 hover:!text-orange-100 font-semibold">Basel 2019</Link>.
          </p>
          <p>
            In this record, the milestone is not simply surviving on tour, but actually lifting the trophy: Gonzales set the extreme Open Era ceiling at 44, Rosewall represents the other great pre-modern longevity benchmark, while Djokovic is the elite-career version of the modern ATP Tour record — a former No. 1 and 24-time major champion still winning tour-level titles well past 38.
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

      {renderTable(currentPlayers, start)}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <Modal show={showModal} onClose={() => setShowModal(false)} title="Oldest Title Winners">
        {renderTable(data)}
      </Modal>
    </section>
  );
};

export default OldestWinners;

