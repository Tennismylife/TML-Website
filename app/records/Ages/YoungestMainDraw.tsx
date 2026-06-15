'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
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

interface YoungestMainDrawProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  fetchEnabled?: boolean;
  fetchRequestId?: string | null;
  description?: string;
  initialData?: Player[];
}

export default function YoungestMainDraw({ selectedSurfaces, selectedLevels, selectedRounds, fetchEnabled, fetchRequestId, description, initialData }: YoungestMainDrawProps) {
  const enabled = !!fetchEnabled;
  const [data, setData] = useState<Player[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const perPage = 20;

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      // Always re-fetch on mount when server provided `initialData` so the
      // client replaces SSR top-10 with the full (limit=100) result set.
      const shouldFetch = showModal || (enabled && fetchRequestId) || (Array.isArray(initialData) && initialData.length > 0);
      if (!shouldFetch) {
        if (Array.isArray(initialData)) setData(initialData);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const query = new URLSearchParams();
        query.append("type", "youngest");
        selectedSurfaces.forEach((s) => query.append("surface", s));
        selectedLevels.forEach((l) => query.append("level", l));
        if (selectedRounds) query.append("round", selectedRounds);
        query.append("limit", showModal ? "1000" : "100");

        const res = await fetch(`/api/records/ages/maindraw?${query.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to fetch youngest main draw");
        const fetchedData = await res.json();
        setData(fetchedData.youngestPlayers || []);
      } catch (err: any) {
        if (err.name !== "AbortError") console.error(err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [selectedSurfaces, selectedLevels, selectedRounds, enabled, showModal, fetchRequestId, initialData]);

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
            const year = p.year || (typeof p.tourney_id === "string" ? p.tourney_id.split("-")[1] : "unknown");
            const tourneyId = typeof p.tourney_id === "string" ? p.tourney_id.split("-")[0] : p.tourney_id;

            return (
              <tr key={`${p.id}-${p.event_id}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  <div className="flex items-center justify-center gap-2">
                    <Flag ioc={p.ioc} className="w-4 h-3" />
                    <Link href={playerSurfaceOrMatchesUrl((p as any).slug ?? String(p.id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="text-indigo-300 hover:underline">{p.name}</Link>
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

  const totalPages = Math.ceil(data.length / perPage);
  const start = (page - 1) * perPage;
  const currentPlayers = data.slice(start, start + perPage);

  return (
    <section className="mb-8">
      {description && <div className="text-3xl font-bold text-white mb-6 text-center">{description}</div>}

      {pathname?.includes('/records/youngest-players-in-main-draw-at-grand-slam') && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for youngest players in a men’s singles Grand Slam main draw stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Tommy Ho</span></span>, who appeared at the <Link href="/tournaments/us-open/1988" className="!text-orange-300 hover:!text-orange-100 font-semibold">1988 US Open</Link> aged <strong className="!text-amber-300">15 years, 2 months and 12 days</strong> — the youngest recorded men’s singles main-draw appearance at a Grand Slam in the Open Era.             In that opening-round match, Ho faced <span className="inline-flex items-center gap-2"><Flag ioc="RSA" className="w-4 h-3" /><span>Johan Kriek</span></span>, a former Australian Open champion, and lost 6-4, 7-6, 7-6. The result turned the 1988 US Open into a pure precocity milestone rather than a competitive benchmark: Ho was still only 15, but already entering one of the sport’s biggest main draws
          </p>
          <p>
            Just behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Michael Chang</span></span>, who played the <Link href="/tournaments/us-open/1987" className="!text-orange-300 hover:!text-orange-100 font-semibold">1987 US Open</Link> aged <strong className="!text-amber-300">15 years, 6 months and 10 days</strong> and made the achievement far more competitive by beating <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Paul McNamee</span></span> in the first round, becoming the youngest male player in the Open Era to win a US Open main-draw match. Chang later transformed that early promise into history, winning Roland Garros 1989 at <strong className="!text-amber-300">17 years and 110 days</strong>, still the youngest men’s singles Grand Slam title of the Open Era.
          </p>
          <p>
            Other names near the top of the youngest Grand Slam main-draw list include <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Billy Martin</span></span>, who played the <Link href="/tournaments/us-open/1972" className="!text-orange-300 hover:!text-orange-100 font-semibold">1972 US Open</Link> aged <strong className="!text-amber-300">15 years, 8 months and 6 days</strong>; <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>François Errard</span></span>, who appeared at <Link href="/tournaments/roland-garros/1983" className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 1983</Link> aged <strong className="!text-amber-300">15 years, 8 months and 13 days</strong>; <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Lleyton Hewitt</span></span>, who entered the <Link href="/tournaments/australian-open/1997" className="!text-orange-300 hover:!text-orange-100 font-semibold">1997 Australian Open</Link> aged <strong className="!text-amber-300">15 years, 10 months and 20 days</strong>; and <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Richard Gasquet</span></span>, who played <Link href="/tournaments/roland-garros/2002" className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2002</Link> aged <strong className="!text-amber-300">15 years, 11 months and 9 days</strong>.
          </p>
          <p>
            A separate modern reference point is <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, who made his Grand Slam main-draw debut at <Link href="/tournaments/wimbledon/2003" className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2003</Link> aged <strong className="!text-amber-300">17 years and 20 days</strong>, already mature enough to win matches on grass before developing into one of the greatest major champions in history.
          </p>
          <p>
            In this record, the milestone is simply entering the draw: Tommy Ho set the extreme Open Era ceiling for youth at just over 15 years old, while Michael Chang represents the elite-career version of the record — a teenage prodigy who did not merely appear early, but quickly converted that precocity into one of the most famous Grand Slam title runs ever.
          </p>
        </div>
      )}

      {pathname?.includes('/records/youngest-grand-slam-finalists') && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for youngest Grand Slam finalists stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Michael Chang</span></span>, who reached — and won — the <Link href="/tournaments/roland-garros/1989" className="!text-orange-300 hover:!text-orange-100 font-semibold">1989 Roland Garros</Link> final aged <strong className="!text-amber-300">17 years, 3 months and 20 days</strong>, the youngest recorded men’s singles Grand Slam finalist of the Open Era.

            Behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Boris Becker</span></span>, finalist and champion at <Link href="/tournaments/wimbledon/1985" className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 1985</Link> aged <strong className="!text-amber-300">17 years, 7 months and 15 days</strong>, when he beat <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Kevin Curren</span></span> 6-3, 6-7, 7-6, 6-4 to become the youngest Wimbledon men’s singles champion. Then comes <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Mats Wilander</span></span>, who won <Link href="/tournaments/roland-garros/1982" className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 1982</Link> aged 17 years, 9 months and 15 days, defeating <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Guillermo Vilas</span></span> 1-6, 7-6, 6-0, 6-4.
          </p>
          <p>
            The next name is <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Bjorn Borg</span></span>, who reached and won the <Link href="/tournaments/roland-garros/1974" className="!text-orange-300 hover:!text-orange-100 font-semibold">1974 Roland Garros</Link> final aged <strong className="!text-amber-300">18 years and 10 days</strong>, before becoming one of the defining Grand Slam players of the 1970s. A later modern reference point is <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, finalist and champion at Roland Garros 2005 aged <strong className="!text-amber-300">19 years and 2 days</strong>, marking the beginning of the most dominant single-tournament career in men’s Grand Slam history.
          </p>
          <p>
            In this record, the milestone is not simply entering the draw, but surviving two full weeks of best-of-five tennis to reach the title match: Chang set the extreme Open Era ceiling at 17, Becker and Wilander confirmed the golden era of teenage champions, lam final into the start of an all-time dynasty.
          </p>
        </div>
      )}

      {pathname?.includes('/records/youngest-grand-slam-quarterfinalists') && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for youngest Grand Slam quarterfinalists stands <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Boris Becker</span></span>, who reached the quarterfinals of the <Link href="/tournaments/australian-open/1984" className="!text-orange-300 hover:!text-orange-100 font-semibold">1984 Australian Open</Link> aged <strong className="!text-amber-300">17 years and 13 days</strong> — the youngest recorded men’s singles Grand Slam quarterfinalist of the Open Era.             In that tournament, played on grass at Kooyong, Becker reached the last eight before losing to <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Ben Testerman</span></span> 6-4, 6-3, 6-4. The result was not yet the title-winning breakthrough that would come a few months later at <Link href="/tournaments/wimbledon/1985" className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 1985</Link>, but it was the first major sign that Becker was already physically and competitively ready for Grand Slam tennis at 17.
          </p>
          <p>
            Just behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Bjorn Borg</span></span>, who reached the <Link href="/tournaments/wimbledon/1973" className="!text-orange-300 hover:!text-orange-100 font-semibold">1973 Wimbledon</Link> quarterfinals aged <strong className="!text-amber-300">17 years and 28 days</strong>, losing a five-set match to <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><span>Roger Taylor</span></span> 6-1, 6-8, 3-6, 6-3, 7-5. Borg’s run remains one of the great early teenage Slam breakthroughs, coming before he became the dominant Roland Garros/Wimbledon figure of the 1970s.
          </p>
          <p>
            The next key reference is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Michael Chang</span></span>, who reached the quarterfinals of <Link href="/tournaments/roland-garros/1989" className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 1989</Link> aged <strong className="!text-amber-300">17 years, 3 months and 16 days</strong>. Chang then beat <span className="inline-flex items-center gap-2"><Flag ioc="HAI" className="w-4 h-3" /><span>Ronald Agénor</span></span> 6-4, 2-6, 6-4, 7-6 in the quarterfinals, defeated <span className="inline-flex items-center gap-2"><Flag ioc="RUS" className="w-4 h-3" /><span>Andrei Chesnokov</span></span> in the semifinals, and went on to win the title against <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Stefan Edberg</span></span>, turning a teenage quarterfinal milestone into the youngest men’s Grand Slam title run in history.
          </p>
          <p>
            Other names near the very top include <span className="inline-flex items-center gap-2"><Flag ioc="CRO" className="w-4 h-3" /><span>Goran Ivaniševic</span></span>, quarterfinalist at the <Link href="/tournaments/australian-open/1989" className="!text-orange-300 hover:!text-orange-100 font-semibold">1989 Australian Open</Link> aged 17 years, 4 months and 12 days; <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Brad Drewett</span></span>, quarterfinalist at the <Link href="/tournaments/australian-open/1976" className="!text-orange-300 hover:!text-orange-100 font-semibold">1976 Australian Open</Link> aged 17 years, 5 months and 12 days; <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Pat Cash</span></span>, quarterfinalist at the <Link href="/tournaments/australian-open/1982" className="!text-orange-300 hover:!text-orange-100 font-semibold">1982 Australian Open</Link> aged 17 years, 6 months and 12 days; and Becker again at <Link href="/tournaments/wimbledon/1985" className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 1985</Link>, aged 17 years, 7 months and 11 days, on the way to his historic title.
          </p>
          <p>
            A separate modern reference point is <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Carlos Alcaraz</span></span>, who reached the <Link href="/tournaments/us-open/2021" className="!text-orange-300 hover:!text-orange-100 font-semibold">2021 US Open</Link> quarterfinals at <strong className="!text-amber-300">18</strong>, becoming the youngest men’s US Open quarterfinalist of the Open Era and the youngest man to reach a Grand Slam quarterfinal since Michael Chang at Roland Garros 1990.
          </p>
          <p>
            In this record, the milestone is not simply entering the draw, but surviving four rounds of best-of-five tennis to reach the last eight: Becker set the extreme Open Era ceiling at just <strong className="!text-amber-300">17 years and 13 days</strong>, Borg and Chang represent the classic teenage-prodigy era, while Alcaraz is the modern benchmark for a teenager breaking deep into a major in the physical, post-Big-Three era.
          </p>
        </div>
      )}

      {pathname?.includes('/records/youngest-grand-slam-semifinalists') && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Michael Chang</span></span> is the youngest Slam semifinalist in Open Era at 17 years and 96 days, but he did not stop at the semifinal milestone: he beat Chesnokov 6-1, 5-7, 7-6(4), 7-5, then defeated <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Stefan Edberg</span></span> in the final 6-1, 3-6, 4-6, 6-4, 6-2, becoming the youngest men’s Grand Slam champion in history at <strong className="!text-amber-300">17 years, 3 months and 20 days</strong>. His run also included the famous fourth-round comeback against world No. 1 <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Ivan Lendl</span></span>, turning <Link href="/tournaments/roland-garros/1989" className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 1989</Link> into the ultimate teenage breakthrough rather than just a semifinal record,
          </p>
          <p>
            Behind him come the other great teenage Grand Slam breakthroughs of the Open Era. <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Boris Becker</span></span> reached and won the <Link href="/tournaments/wimbledon/1985" className="!text-orange-300 hover:!text-orange-100 font-semibold">1985 Wimbledon</Link> title match aged <strong className="!text-amber-300">17 years, 7 months and 15 days</strong>, beating <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Kevin Curren</span></span> in the final after defeating <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Anders Järryd</span></span> in the semifinals. <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Mats Wilander</span></span> reached and won Roland Garros 1982 aged <strong className="!text-amber-300">17 years, 9 months and 15 days</strong>, beating <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>José Luis Clerc</span></span> in the semifinals and <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Guillermo Vilas</span></span> in the final.
          </p>
          <p>
            The next major reference point is <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Björn Borg</span></span>, who reached and won <Link href="/tournaments/roland-garros/1974" className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 1974</Link> aged <strong className="!text-amber-300">18 years and 10 days</strong>, defeating <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Harold Solomon</span></span> in the semifinals and <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Manuel Orantes</span></span> in the final. A separate modern reference point is <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> at <Link href="/tournaments/roland-garros/2005" className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2005</Link>: he was older than Chang, Becker, Wilander and Borg, but his teenage semifinal-and-title run at 19 launched one of the most dominant Grand Slam careers ever.
          </p>
          <p>
            In this record, the milestone is not simply entering the draw, but surviving five rounds of best-of-five tennis to reach the final four: Chang set the extreme Open Era ceiling at 17, while Becker, Wilander and Borg show how rare teenage Slam semifinal runs were in the 1970s and 1980s — usually not isolated results, but the beginning of all-time great careers.
          </p>
        </div>
      )}

      {pathname?.includes('/records/youngest-masters-1000-finalists') && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the list for Youngest Masters 1000 Finalists stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Michael Chang</span></span>, who reached the <Link href="/tournaments/canada-masters/1990" className="!text-orange-300 hover:!text-orange-100 font-semibold">1990 Canada Masters / Canadian Open</Link> final in Toronto aged <strong className="!text-amber-300">18 years, 5 months and 8 days</strong> — the youngest recorded men’s singles finalist in Masters 1000 history, with the category beginning in 1990.
          </p>
          <p>
            Chang did not merely reach the final: he won the title, defeating <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jay Berger</span></span> 4-6, 6-3, 7-6(3). His run was especially significant because he beat <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span> in the quarterfinals and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span> in the semifinals before taking the title, making Toronto 1990 both a youth record and a genuine elite-level breakthrough. 
          </p>
          <p>
            Behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, who reached the <Link href="/tournaments/miami-masters/2005" className="!text-orange-300 hover:!text-orange-100 font-semibold">2005 Miami Masters</Link> final aged <strong className="!text-amber-300">18 years and 10 months</strong>, losing to <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span> in a five-set classic, 2-6, 6-7(4), 7-6(5), 6-3, 6-1. Nadal then immediately converted that breakthrough into Masters dominance by winning <Link href="/tournaments/monte-carlo-masters/2005" className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo 2005</Link> at <strong className="!text-amber-300">18 years and 318 days</strong>, becoming the second-youngest Masters 1000 champion after Chang.
          </p>
          <p>
            A separate modern reference point is <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Carlos Alcaraz</span></span>, who reached and won the <Link href="/tournaments/miami-masters/2022" className="!text-orange-300 hover:!text-orange-100 font-semibold">2022 Miami Open</Link> final aged <strong className="!text-amber-300">18 years and 333 days</strong>, beating <span className="inline-flex items-center gap-2"><Flag ioc="NOR" className="w-4 h-3" /><span>Casper Ruud</span></span> to capture his first Masters 1000 title. More recently, <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Jakub Mensik</span></span> joined the teenage Masters 1000 finalist/champion group at <Link href="/tournaments/miami-masters/2025" className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 2025</Link>, defeating <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span> in the final and becoming one of the youngest Masters 1000 champions in series history.
          </p>
          <p>
            In this record, the milestone is not simply entering the draw, but surviving an elite Masters 1000 field to reach the title match: Chang set the extreme ceiling at 18 years and 5 months, Nadal represents the teenage clay-court explosion that followed, while Alcaraz and Mensik are the modern versions of the same feat — teenagers already capable of winning one of the tour’s biggest titles below Grand Slam level.
          </p>
        </div>
      )}

      {pathname?.includes('/records/youngest-masters-1000-semifinalists') && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the list for youngest ATP Masters 1000 semifinalists stands <span className="inline-flex items-center gap-2"><Flag ioc="CAN" className="w-4 h-3" /><span>Denis Shapovalov</span></span>, who reached the semifinals at the <Link href="/tournaments/canada-masters/2017" className="!text-orange-300 hover:!text-orange-100 font-semibold">2017 Canadian Open in Montreal</Link> at <strong className="!text-amber-300">18 years and 119 days</strong>.             Shapovalov entered the tournament ranked No. 143 and became the youngest Masters 1000 semifinalist since the series began in 1990. His run included wins over <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Juan Martín del Potro</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Adrian Mannarino</span></span> before he lost in the semifinals to <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Alexander Zverev</span></span>.
          </p>
         <p>
            Behind him is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Michael Chang</span></span>, who reached the final four at the <Link href="/tournaments/canada-masters/1990" className="!text-orange-300 hover:!text-orange-100 font-semibold">1990 Canadian Open</Link> and went on to win the title. Chang remains the youngest ATP Masters 1000 champion, winning <Link href="/tournaments/canada-masters/1990" className="!text-orange-300 hover:!text-orange-100 font-semibold">Canada 1990</Link> at <strong className="!text-amber-300">18 years and around five months old</strong>.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="CAN" className="w-4 h-3" /><span>Félix Auger-Aliassime</span></span> reached the <Link href="/tournaments/miami-masters/2019" className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 2019</Link> semifinals at <strong className="!text-amber-300">18 years 221 days</strong>, becoming the youngest Miami semifinalist in tournament history. He beat <span className="inline-flex items-center gap-2"><Flag ioc="HRV" className="w-4 h-3" /><span>Borna Coric</span></span> in the quarterfinals to reach the last four, after entering the tournament as a qualifier.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> is another key teenage entry in this record. At <Link href="/tournaments/miami-masters/2005" className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 2005</Link>, he reached the final at <strong className="!text-amber-300">18 years and 304 days</strong>, after passing through the semifinal stage. A few weeks later, he won <Link href="/tournaments/monte-carlo-masters/2005" className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo 2005</Link> at <strong className="!text-amber-300">18 years and 318 days</strong>, becoming one of the youngest Masters 1000 champions in history. <a href="https://www.tennis.com/news/articles/stat-of-the-day-carlos-alcaraz-first-masters-1000-final-miami" className="!text-orange-300 hover:!text-orange-100 font-semibold" target="_blank" rel="noopener noreferrer"></a><a href="https://www.tennis365.com/facts-stats/youngest-men-win-masters-1000-title-jakub-mensik-rafael-nadal-carlos-alcaraz" className="!text-orange-300 hover:!text-orange-100 font-semibold" target="_blank" rel="noopener noreferrer"></a>
          </p>

          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Carlos Alcaraz</span></span> joined the youngest Masters 1000 semifinalist group at <Link href="/tournaments/miami-masters/2022" className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 2022</Link>. He beat <span className="inline-flex items-center gap-2"><Flag ioc="HRV" className="w-4 h-3" /><span>Marin Cilic</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="GRE" className="w-4 h-3" /><span>Stefanos Tsitsipas</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Miomir Kecmanovic</span></span> before defeating <span className="inline-flex items-center gap-2"><Flag ioc="POL" className="w-4 h-3" /><span>Hubert Hurkacz</span></span> in the semifinals, becoming the fourth-youngest Masters 1000 finalist in history at <strong className="!text-amber-300">18 years and 306 days</strong>.
          </p>
          <p>
            More recently, <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Jakub Mensik</span></span> reached the <Link href="/tournaments/miami-masters/2025" className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 2025</Link> semifinals at <strong className="!text-amber-300">19 years 197 days</strong>, becoming the first player born in 2005 to reach a Masters 1000 semifinal. He then beat <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Taylor Fritz</span></span> in the semifinals and went on to win the title against <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>.
          </p>
          <p>
            The record number is <strong className="!text-amber-300">18 years and 119 days</strong>: Denis Shapovalov remains the youngest ATP Masters 1000 semifinalist, with his breakthrough run at Montreal 2017.
          </p>
        </div>
      )}

      {pathname?.includes('/records/youngest-masters-1000-quarterfinalists') && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the list for youngest ATP Masters 1000 quarterfinalists stands <span className="inline-flex items-center gap-2"><Flag ioc="CAN" className="w-4 h-3" /><span>Denis Shapovalov</span></span>, who reached the quarter-finals at the <Link href="/tournaments/canada-masters/2017" className="!text-orange-300 hover:!text-orange-100 font-semibold">2017 Canada Masters</Link> in Montreal at <strong className="!text-amber-300">18 years and 114 days</strong>. Shapovalov is the youngest player to reach a Masters 1000 quarter-final since the category began in 1990. His run in <Link href="/tournaments/canada-masters/2017" className="!text-orange-300 hover:!text-orange-100 font-semibold">Canada 2017</Link> later continued into the semifinals, making him also the youngest Masters 1000 semifinalist at <strong className="!text-amber-300">18 years and 119 days</strong>.
          </p>
          <p>
            Second is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Michael Chang</span></span>, who reached the quarter-finals at the <Link href="/tournaments/canada-masters/1990" className="!text-orange-300 hover:!text-orange-100 font-semibold">1990 Canada Masters</Link> at <strong className="!text-amber-300">18 years and 151 days</strong>. Chang went on to win the title, becoming the youngest Masters 1000 champion.
          </p>
          <p>
            Third is <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Fabrice Santoro</span></span>, who reached the <Link href="/tournaments/rome-masters/1991" className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome Masters</Link> quarter-finals in 1991 at <strong className="!text-amber-300">18 years and 154 days</strong>.
          </p>
          <p>
            Chang appears again in fourth place, after reaching the <Link href="/tournaments/cincinnati-masters/1990" className="!text-orange-300 hover:!text-orange-100 font-semibold">Cincinnati Masters</Link> quarter-finals in 1990 at <strong className="!text-amber-300">18 years and 165 days</strong>.
          </p>
          <p>
            The next names are <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andy Roddick</span></span> at <Link href="/tournaments/miami-masters/2001" className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 2001</Link>, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span> at <Link href="/tournaments/miami-masters/1990" className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 1990</Link>, <span className="inline-flex items-center gap-2"><Flag ioc="CAN" className="w-4 h-3" /><span>Félix Auger-Aliassime</span></span> at <Link href="/tournaments/miami-masters/2019" className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 2019</Link>, <span className="inline-flex items-center gap-2"><Flag ioc="UKR" className="w-4 h-3" /><span>Andrei Medvedev</span></span> at <Link href="/tournaments/monte-carlo-masters/1993" className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo 1993</Link>, <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> at <Link href="/tournaments/miami-masters/2005" className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 2005</Link> and <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Richard Gasquet</span></span> at <Link href="/tournaments/monte-carlo-masters/2005" className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo 2005</Link>.
          </p>
          <p>
            The record number is <strong className="!text-amber-300">18 years and 114 days</strong>: Denis Shapovalov leads the ATP Masters 1000 list for youngest quarterfinalists, ahead of Michael Chang, Fabrice Santoro and the other teenage entries of the early Masters 1000 era.
          </p>
        </div>
      )}

      {pathname?.includes('/records/youngest-players-in-main-draw-at-masters-1000') && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the list for youngest players in a Masters 1000 main draw stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Donald Young</span></span>, who appeared at the <Link href="/tournaments/indian-wells-masters/2005" className="!text-orange-300 hover:!text-orange-100 font-semibold">2005 Indian Wells Masters</Link> aged <strong className="!text-amber-300">15 years and 227 days</strong>, the youngest recorded men’s singles main-draw appearance in Masters 1000 history. Indian Wells 2005 was an ATP Masters 1000 event played from 7–20 March 2005, and Young, still only 15, entered the main draw as a wildcard before losing in the opening round to <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Arnaud Clément</span></span>, 6-3, 6-2.
          </p>
          <p>
            Young immediately reinforced the record two weeks later at the <Link href="/tournaments/miami-masters/2005" className="!text-orange-300 hover:!text-orange-100 font-semibold">2005 Miami Masters</Link>, where he appeared again aged <strong className="!text-amber-300">15 years and 241 days</strong>, making him both No. 1 and No. 2 on the youngest Masters 1000 main-draw list. Miami 2005 was staged from 21 March–3 April, and Young lost his first-round match to <span className="inline-flex items-center gap-2"><Flag ioc="MON" className="w-4 h-3" /><span>Jean-René Lisnard</span></span>, 6-4, 7-5.
          </p>
          <p>
            A separate precocity reference point is <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Richard Gasquet</span></span> at <Link href="/tournaments/monte-carlo-masters/2002" className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo 2002</Link> (aged <strong className="!text-amber-300">15 years 301 days</strong>): he was older than Young in main-draw terms, but his run remains historically important because he became one of the youngest — and most famous — Masters 1000 match winners by beating <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Franco Squillari</span></span> as a 15-year-old. In this record, however, the milestone is simply entering the draw, and Donald Young set the extreme Masters 1000 youth ceiling twice in March 2005.
          </p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-300">Loading...</div>
      ) : !data.length ? (
        <div className="text-center py-8 text-gray-300">No data available.</div>
      ) : (
        <>
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

          <Modal show={showModal} onClose={() => setShowModal(false)} title="Youngest Player in Main Draw">
            {renderTable(data)}
          </Modal>
        </>
      )}
    </section>
  );
}
 