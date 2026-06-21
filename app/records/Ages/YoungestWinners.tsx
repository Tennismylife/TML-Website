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

interface YoungestWinnersProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  fetchEnabled?: boolean;
  fetchRequestId?: string | null;
  description?: string;
  initialData?: Player[];
}

const YoungestWinners = ({ selectedSurfaces, selectedLevels, fetchEnabled, fetchRequestId, description, initialData }: YoungestWinnersProps) => {
  const enabled = !!fetchEnabled;
  const [data, setData] = useState<Player[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
      try {
        const query = new URLSearchParams();
        query.append("type", "youngest");
        selectedSurfaces.forEach((s) => query.append("surface", s));
        selectedLevels.forEach((l) => query.append("level", l));
        query.append("limit", showModal ? "1000" : "100");
        const url = `/api/records/ages/winners?${query.toString()}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to fetch youngest winners");
        const fetchedData = await res.json();
        setData(fetchedData.youngestWinners || []);
      } catch (err: any) {
        if (err.name !== "AbortError") console.error(err);
        if (!Array.isArray(initialData) || initialData.length === 0) {
          setData([]);
          setError("Failed to load records.");
        }
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

  const hasRows = data.length > 0;
  const totalPages = Math.ceil(data.length / perPage);
  const start = (page - 1) * perPage;
  const currentPlayers = data.slice(start, start + perPage);

  return (
    <section className="mb-8">
      {error ? (
        <div className="text-center py-8 text-gray-300">{error}</div>
      ) : loading && !hasRows ? (
        <div className="text-center py-8 text-gray-300">Loading...</div>
      ) : hasRows ? (
        <>
      {description && <h2 className="mb-6 text-center text-2xl font-semibold text-white">{description}</h2>} 

      {!!description && selectedLevels?.size === 0 && selectedSurfaces?.has('Hard') && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            This record tracks the youngest hard-court title winners in the Open Era, and the benchmark is still <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Aaron Krickstein</span></span>, who won Tel Aviv 1983 aged <strong className="!text-amber-300">16 years and 69 days</strong>. It remains the youngest recorded men’s singles tour-level title on hard court.
          </p>
          <p>
            Krickstein defeated <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Christoph Zipf</span></span> 7-6, 6-3 in that final, and ATP’s own bio notes that he was 16 years, 2 months and 13 days old when he won Tel Aviv 1983. That same hard-court breakthrough shows up again in his 1984 results: <Link href="/tournaments/boston/1984" className="!text-orange-300 hover:!text-orange-100 font-semibold">Boston 1984</Link> at <strong className="!text-amber-300">16 years and 349 days</strong>, then <Link href="/tournaments/tel-aviv/1984" className="!text-orange-300 hover:!text-orange-100 font-semibold">Tel Aviv 1984</Link> at <strong className="!text-amber-300">17 years and 39 days</strong> and <Link href="/tournaments/geneva/1984" className="!text-orange-300 hover:!text-orange-100 font-semibold">Geneva 1984</Link> at <strong className="!text-amber-300">17 years and 46 days</strong>.
          </p>
          <p>
            The next hard-court teenage benchmarks are <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Michael Chang</span></span>, winner of <Link href="/tournaments/san-francisco/1988" className="!text-orange-300 hover:!text-orange-100 font-semibold">San Francisco 1988</Link> at <strong className="!text-amber-300">16 years and 216 days</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Lleyton Hewitt</span></span>, champion at <Link href="/tournaments/adelaide/1998" className="!text-orange-300 hover:!text-orange-100 font-semibold">Adelaide 1998</Link> at <strong className="!text-amber-300">16 years and 314 days</strong>. In the ATP Tour era, Hewitt is the key reference point because his record came after the Grand Prix period ended.
          </p>
          <p>
            A more recent hard-court reference point is <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Carlos Alcaraz</span></span>, who won the <Link href="/tournaments/miami-masters/2022" className="!text-orange-300 hover:!text-orange-100 font-semibold">2022 Miami Open</Link> at <strong className="!text-amber-300">18 years and 320 days</strong>, followed later by <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Jakub Mensik</span></span>, who won <Link href="/tournaments/miami-masters/2025" className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 2025</Link> at <strong className="!text-amber-300">19 years and 197 days</strong>. The record is still built around very early breakthroughs on hard court, but the modern ATP Tour examples start a little later than Krickstein’s 1983 ceiling.
          </p>
        </div>
      )}
      {!!description && selectedLevels?.size === 0 && selectedSurfaces?.has('Clay') && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for Youngest Clay-Court Title Winners stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Aaron Krickstein</span></span>, who won Boston 1984 aged <strong className="!text-amber-300">16 years and 349 days</strong> using tournament-week age — the youngest recorded men’s singles tour-level title on clay. Krickstein is at No. 1 for youngest clay-court title winners, while Ultimate Tennis Statistics records Boston 1984 as a clay-court event held from 16 July 1984, with Krickstein as champion.             In that final, Krickstein defeated <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>José Luis Clerc</span></span> 7-6, 3-6, 6-4 on the green clay of the Longwood Cricket Club, coming back from 3-0 down in the deciding set to win the title. That made <Link href="/tournaments/boston/1984" className="!text-orange-300 hover:!text-orange-100 font-semibold">Boston 1984</Link> not just a teenage title milestone, but the extreme clay-court version of the record: a 16-year-old beating an established clay specialist in a tour-level final.             Krickstein also appears again near the very top of this record: he won Geneva 1984 aged <strong className="!text-amber-300">17 years and 46 days</strong>, defeating <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Henrik Sundström</span></span> 6-7, 6-1, 6-4. Between Boston and Geneva, Krickstein’s 1984 season became one of the strongest teenage clay-court title bursts of the Open Era.
          </p>
          <p>
            Behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Guillermo Perez-Roldan</span></span>, who won Munich 1987 aged <strong className="!text-amber-300">17 years and 195 days</strong>, defeating <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Marián Vajda</span></span> 6-3, 7-6 on outdoor clay. Pérez-Roldán quickly reinforced that clay-court profile by also winning Athens 1987 aged <strong className="!text-amber-300">17 years and 237 days</strong>, making him one of the purest teenage clay specialists in men’s tennis history.
          </p>
          <p>
            A separate modern reference point is <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, who won <Link href="/tournaments/sopot/2004" className="!text-orange-300 hover:!text-orange-100 font-semibold">Sopot 2004</Link> aged <strong className="!text-amber-300">18 years, 2 months and 12 days</strong>; in the strict ATP Tour era beginning in 1990, ATP lists Nadal among the youngest champions, behind players such as Lleyton Hewitt and Andrei Medvedev. Another modern benchmark is <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Carlos Alcaraz</span></span>, who won <Link href="/tournaments/umag/2021" className="!text-orange-300 hover:!text-orange-100 font-semibold">Umag 2021</Link> aged <strong className="!text-amber-300">18 years, 2 months and 20 days</strong>, becoming one of the youngest ATP Tour-era champions and a clear modern successor to the teenage clay-court breakthrough tradition.
          </p>
        </div>
      )}
      {!!description && selectedLevels?.size === 0 && selectedSurfaces?.has('Grass') && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Boris Becker</span></span> leads the Open Era list for Youngest Grass-Court Title Winners after winning Queen's Club 1985 at <strong className="!text-amber-300">17 years and 200 days</strong> using tournament-week age. TennisMyLife also lists his Queen's Club title at <strong className="!text-amber-300">17 years and 200 days</strong>, and Ultimate Tennis Statistics records the event as an ATP 500 grass-court tournament beginning on 10 June 1985.             In that final, Becker defeated <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Johan Kriek</span></span> 6-2, 6-3, capturing the first Grand Prix title of his career just three weeks before his historic Wimbledon breakthrough. Contemporary reports note that the 17-year-old produced 11 aces and finished the match in just over an hour.             Becker then backed it up at <Link href="/tournaments/wimbledon/1985" className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 1985</Link>, where he won at <strong className="!text-amber-300">17 years and 214 days</strong>, defeating <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Kevin Curren</span></span> 6-3, 6-7, 7-6, 6-4. That made him the youngest men's Wimbledon champion in history, as well as the first unseeded player and first German man to win the title.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Bjorn Borg</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Pat Cash</span></span> are the next youngest grass-court champions in the set, both at <strong className="!text-amber-300">17 years and 214 days</strong>. Borg won Auckland 1974 against <span className="inline-flex items-center gap-2"><Flag ioc="NZL" className="w-4 h-3" /><span>Onny Parun</span></span> 6-4, 6-3, 6-1, while Cash won Melbourne 1982 over <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Rod Frawley</span></span> 6-4, 7-6; ATP's bio also notes Cash as the youngest Victorian Open champion in Melbourne at the same age.
          </p>
          <p>
            The record is built around early wins on grass, with Becker's Queen's Club and Wimbledon double setting the Open Era benchmark and Borg and Cash filling the next spots on the list.
          </p>
        </div>
      )}
      {!!description && selectedLevels?.has('G') && selectedSurfaces?.size === 0 && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for Youngest Grand Slam Title Winners stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Michael Chang</span></span>, who won Roland Garros 1989 aged <strong className="!text-amber-300">17 years and 109 days</strong> — the youngest recorded men’s singles Grand Slam champion of the Open Era. Guinness lists Chang as the youngest male Open Era Grand Slam singles winner at 17 years, 109 days, while other tennis references often round/report it as 17 years and 110 days.             In that final, Chang defeated <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Stefan Edberg</span></span> 6-1, 3-6, 4-6, 6-4, 6-2, completing one of the most famous teenage title runs in tennis history. His path included the iconic fourth-round victory over world No. 1 <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Ivan Lendl</span></span>, remembered for Chang’s cramps, moonballs and underarm serve — turning Roland Garros 1989 into the ultimate Grand Slam precocity milestone.
          </p>
           <p>
            Behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Boris Becker</span></span>, who won <Link href="/tournaments/wimbledon/1985" className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 1985</Link> aged <strong className="!text-amber-300">17 years and 7 months</strong>, defeating <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Kevin Curren</span></span> in the final to become the youngest men's Wimbledon champion. Then comes <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Mats Wilander</span></span>, champion at <Link href="/tournaments/roland-garros/1982" className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 1982</Link> aged <strong className="!text-amber-300">17 years and 9 months</strong>, followed by <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Bjorn Borg</span></span>, who won <Link href="/tournaments/roland-garros/1974" className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 1974</Link> just after turning 18.
          </p>
          <p>
            A separate modern reference point is <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, who won <Link href="/tournaments/roland-garros/2005" className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2005</Link> aged <strong className="!text-amber-300">19 years and 2 days</strong>, becoming the youngest men's Grand Slam champion of the 2000s and launching the most dominant single-tournament career in major history. Another key benchmark is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span>, who won the <Link href="/tournaments/us-open/1990" className="!text-orange-300 hover:!text-orange-100 font-semibold">1990 US Open</Link> aged <strong className="!text-amber-300">19 years and 28 days</strong>, still the youngest men's US Open champion of the Open Era.
          </p>
          <p>
            In this record, the milestone is not simply reaching the final, but winning seven best-of-five matches and lifting the trophy: Chang set the extreme Open Era ceiling at 17, Becker and Wilander represent the golden age of teenage Grand Slam champions, while Nadal and Sampras are the later elite-career versions of the same feat — teenage major winners whose first Slam title became the foundation for legendary careers.
          </p>
        </div>
      )}
      {!!description && selectedLevels?.size === 0 && selectedSurfaces?.has('Carpet') && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
                    <p>
            At the top of the Open Era list for Youngest Carpet-Court Title Winners stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Michael Chang</span></span>, who won <Link href="/tournaments/san-francisco/1988" className="!text-orange-300 hover:!text-orange-100 font-semibold">San Francisco 1988</Link> aged <strong className="!text-amber-300">16 years and 216 days</strong> — the youngest recorded men’s singles title winner on carpet. <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Bjorn Borg</span></span>’s <Link href={getTourneyHref({ slug: "london-wct", year: 1974 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">London WCT 1974</Link> title also sits near the top, at about <strong className="!text-amber-300">17 years and 253-257 days</strong> depending on whether the record uses tournament-week or event-date calculation.
          </p>
          <p>
            Borg appears again near the very top with <Link href={getTourneyHref({ slug: "sao-paulo", year: 1974 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Sao Paulo WCT 1974</Link>, won aged roughly <strong className="!text-amber-300">17 years and 277–278 days</strong>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Arthur Ashe</span></span> 6-2, 3-6, 6-3. The 1974 WCT circuit records Sao Paulo as an indoor carpet event, making Borg’s early-1974 indoor run one of the strongest teenage carpet-court bursts in men’s tennis history.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Michael Chang</span></span> also won <Link href={getTourneyHref({ slug: "antwerp", year: 1989 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wembley 1989</Link> aged <strong className="!text-amber-300">17 years and 258 days</strong> using tournament-date age. Wembley 1989 was played on indoor carpet, and Chang beat <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Guy Forget</span></span> in the final 6-2, 6-1, 6-1, adding a fast-court title to the same season in which he had already become the youngest men’s Grand Slam champion at Roland Garros.
          </p>
          <p>
            In this record, the milestone is not simply winning young, but winning young on carpet — a fast, now-discontinued surface that rewarded quick reactions, clean timing and first-strike tennis. Chang sets the Open Era ceiling at 16 years, Borg remains the closest historical reference point just behind him, and the category is effectively frozen because carpet disappeared from the ATP Tour after the 2000s.
          </p>
        </div>
      )}
      {!!description && selectedLevels?.has('M') && selectedSurfaces?.size === 0 && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for Youngest Masters 1000 Title Winners stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Michael Chang</span></span>, who won the 1990 Canada Masters / Canadian Open in Toronto aged <strong className="!text-amber-300">18 years and 151 days</strong> by tournament-week age — the youngest recorded men’s singles champion in Masters 1000 history, with the category beginning in 1990. In that final, Chang defeated <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jay Berger</span></span> 4-6, 6-3, 7-6(3), becoming the first great teenage champion of the Masters 1000 era. His run was not just a youth-record milestone: ATP highlights that the 18-year-old beat <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span> back-to-back before taking the title against Berger, making Toronto 1990 a genuine elite-level breakthrough.
          </p>
          <p>
            Behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, who won the 2005 Monte-Carlo Masters aged 18 years and 312 days, defeating <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Guillermo Coria</span></span> in the final and claiming the first of his record Monte-Carlo titles. Nadal then added Rome 2005 before turning 19, giving him two Masters 1000 titles as a teenager.
          </p>
          <p>
            A separate modern reference point is <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Carlos Alcaraz</span></span>, who won the <Link href="/tournaments/miami-masters/2022" className="!text-orange-300 hover:!text-orange-100 font-semibold">2022 Miami Open</Link> aged <strong className="!text-amber-300">18 years and 320 days</strong> by tournament-week age, beating <span className="inline-flex items-center gap-2"><Flag ioc="NOR" className="w-4 h-3" /><span>Casper Ruud</span></span> 7-5, 6-4. Miami 2022 made Alcaraz the youngest Miami men's champion and the youngest Masters 1000 champion since Nadal at Monte-Carlo 2005.
          </p>
          <p>
            Other teenage Masters 1000 title winners near the top include <span className="inline-flex items-center gap-2"><Flag ioc="DNK" className="w-4 h-3" /><span>Holger Rune</span></span>, champion at <Link href="/tournaments/paris-masters/2022" className="!text-orange-300 hover:!text-orange-100 font-semibold">Paris 2022</Link> aged <strong className="!text-amber-300">19 years and 185 days</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Jakub Mensik</span></span>, champion at <Link href="/tournaments/miami-masters/2025" className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 2025</Link> aged <strong className="!text-amber-300">19 years and 197 days</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="UKR" className="w-4 h-3" /><span>Andrei Medvedev</span></span>, champion at <Link href="/tournaments/monte-carlo-masters/1994" className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo 1994</Link> aged <strong className="!text-amber-300">19 years and 230 days</strong>.
          </p>
          <p>
            In this record, the milestone is not simply reaching the final, but winning one of the tour’s biggest non-Slam titles: Chang set the extreme Masters 1000 ceiling at 18, Nadal represents the teenage clay-court explosion that followed, while Alcaraz, Rune and Mensik are the modern versions of the same feat — teenagers already capable of beating elite fields and lifting Masters 1000 trophies.
          </p>
        </div>
      )}
      {!!description && selectedLevels?.size === 0 && selectedSurfaces?.size === 0 && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for Youngest ATP Title Winners stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Aaron Krickstein</span></span>, who won <Link href="/tournaments/tel-aviv/1983" className="!text-orange-300 hover:!text-orange-100 font-semibold">Tel Aviv 1983</Link> aged <strong className="!text-amber-300">16 years and 69 days</strong> in tournament-week age terms — the youngest recorded men's singles tour-level title winner of the Open Era. Krickstein is No. 1 at <strong className="!text-amber-300">16y 69d</strong>, while ATP's own bio notes that he became the youngest player ever to win a Grand Prix event at 16 years, 2 months and 13 days.  In that final, Krickstein defeated <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Christoph Zipf</span></span> 7-6, 6-3, turning <Link href="/tournaments/tel-aviv/1983" className="!text-orange-300 hover:!text-orange-100 font-semibold">Tel Aviv 1983</Link> into the ultimate teenage title-winning milestone. He was not merely making an early appearance on tour: he actually finished the week as champion, setting a record that still stands as one of the most extreme age marks in men's tennis.
          </p>
          <p>
            Krickstein dominates the very top of this record: he also won <Link href="/tournaments/boston/1984" className="!text-orange-300 hover:!text-orange-100 font-semibold">Boston 1984</Link> aged <strong className="!text-amber-300">16 years and 349 days</strong>, then returned to win <Link href="/tournaments/tel-aviv/1984" className="!text-orange-300 hover:!text-orange-100 font-semibold">Tel Aviv 1984</Link> aged <strong className="!text-amber-300">17 years and 39 days</strong> and <Link href="/tournaments/geneva/1984" className="!text-orange-300 hover:!text-orange-100 font-semibold">Geneva 1984</Link> aged <strong className="!text-amber-300">17 years and 46 days</strong>. That cluster makes him the defining teenage title-winner of the Open Era, not a one-week anomaly.
          </p>
          <p>
            Behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Michael Chang</span></span>, who won <Link href="/tournaments/san-francisco/1988" className="!text-orange-300 hover:!text-orange-100 font-semibold">San Francisco 1988</Link> aged <strong className="!text-amber-300">16 years and 216 days</strong>, before later winning <Link href="/tournaments/roland-garros/1989" className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 1989</Link> aged <strong className="!text-amber-300">17 years and 96 days</strong> — still the youngest men's Grand Slam singles title of the Open Era. Another major teenage benchmark is <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Lleyton Hewitt</span></span> who won <Link href="/tournaments/adelaide/1998" className="!text-orange-300 hover:!text-orange-100 font-semibold">Adelaide 1998</Link> aged <strong className="!text-amber-300">16 years and 314 days</strong>; in the strict ATP Tour era beginning in 1990, ATP lists Hewitt as the youngest champion at 16 years, 10 months and 18 days.
          </p>
          <p>
            Other names near the top include <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Guillermo Perez-Roldan</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Boris Becker</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Bjorn Borg</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Pat Cash</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Mats Wilander</span></span>, and <span className="inline-flex items-center gap-2"><Flag ioc="UKR" className="w-4 h-3" /><span>Andrei Medvedev</span></span> — all title winners before turning 18.
          </p>
          <p>
            In this record, the milestone is not simply reaching a final or breaking into the tour early, but actually lifting a tour-level trophy: Krickstein set the Open Era ceiling at 16, Chang represents the Grand Slam-prodigy version of the record, while Hewitt is the modern ATP Tour-era benchmark for teenage title-winning precocity.
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

      <Modal show={showModal} onClose={() => setShowModal(false)} title="Youngest Title Winners">
        {renderTable(data)}
      </Modal>
        </>
      ) : (
        <div className="text-center py-8 text-gray-300">No data available.</div>
      )}
    </section>
  );
};

export default YoungestWinners;

