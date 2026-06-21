"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import Flag from '@/components/Flag';
import { createSlug, getTourneyHref } from "@/lib/utils";
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

interface OldestMainDrawProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  fetchEnabled?: boolean;
  fetchRequestId?: string | null;
  description?: string;
  initialData?: Player[];
}

export default function OldestMainDraw({ selectedSurfaces, selectedLevels, selectedRounds, fetchEnabled, fetchRequestId, description, initialData }: OldestMainDrawProps) {
  const enabled = !!fetchEnabled;
  const [data, setData] = useState<Player[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        query.append("type", "oldest");
        selectedSurfaces.forEach((s) => query.append("surface", s));
        selectedLevels.forEach((l) => query.append("level", l));
        if (selectedRounds) query.append("round", selectedRounds);
        query.append("limit", showModal ? "1000" : "100");

        const res = await fetch(`/api/records/ages/maindraw?${query.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to fetch oldest main draw");
        const fetchedData = await res.json();
        setData(fetchedData.oldestPlayers || []);
      } catch (err: any) {
        if (err.name !== "AbortError") console.error(err);
        setData([]);
        setError("Failed to load records.");
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
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200 whitespace-nowrap">{formatAge(p.age)}</td>
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
      {description && (
        <h2 className="mb-6 text-center text-2xl font-semibold text-white">
          {description}
        </h2>
      )}

      {pathname === '/records/oldest-players-in-main-draw' && selectedSurfaces?.size === 0 && selectedLevels?.size === 0 && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for oldest players in an ATP main draw stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Gardnar Mulloy</span></span>, who appeared at <Link href={getTourneyHref({ slug: createSlug('Miami'), year: 1977 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 1977</Link> aged <strong className="!text-amber-300">63 years and 77 days</strong>, the oldest recorded men’s singles main-draw appearance of the Open Era.             In that match, Mulloy faced <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John Whitlinger</span></span> in the opening round, losing 6-0, 6-1 on clay — a result that turned <Link href={getTourneyHref({ slug: createSlug('Miami'), year: 1977 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 1977</Link> into the ultimate longevity milestone rather than a competitive benchmark.             Mulloy dominates the very top of this record: he also appears at <Link href={getTourneyHref({ slug: createSlug('Fort Lauderdale'), year: 1971 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Fort Lauderdale 1971</Link> aged <strong className="!text-amber-300">57 years and 56 days</strong>, <Link href={getTourneyHref({ slug: createSlug('Jacksonville'), year: 1970 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Jacksonville 1970</Link> aged <strong className="!text-amber-300">56 years and 123 days</strong>, and several other late-career main draws in <strong className="!text-amber-300">1968–69</strong>.
 
          </p>
          <p>
            Behind him come other early Open Era veterans such as <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Frank Parker</span></span>, aged <strong className="!text-amber-300">55 years and 30 days</strong> at <Link href={getTourneyHref({ slug: createSlug('Hampton'), year: 1971 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Hampton 1971</Link>; <span className="inline-flex items-center gap-2"><Flag ioc="IRL" className="w-4 h-3" /><span>James McArdle</span></span>, aged <strong className="!text-amber-300">54 years and 67 days</strong> at <Link href={getTourneyHref({ slug: createSlug('Dublin'), year: 1974 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Dublin 1974</Link>; and <span className="inline-flex items-center gap-2"><Flag ioc="ECU" className="w-4 h-3" /><span>Pancho Segura</span></span>, aged <strong className="!text-amber-300">52 years and 249 days</strong> at <Link href={getTourneyHref({ slug: createSlug('Carlsbad WCT'), year: 1974 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Carlsbad WCT 1974</Link>.
          </p>
          <p>
            A separate modern reference point is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>: unlike the older one-off veterans of the early Open Era, Connors remained a genuine tour icon deep into the ATP computer era, making his final ATP singles main-draw appearance at <Link href={getTourneyHref({ slug: createSlug('Atlanta'), year: 1996 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Atlanta 1996</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Richey Reneberg</span></span>, when he was <strong className="!text-amber-300">43</strong>.
          </p>
          <p>
            In this record, the milestone is simply entering the draw: Mulloy set an almost untouchable ceiling at <strong className="!text-amber-300">63 years</strong>, while Connors represents the elite-career version of the record — a former No. 1 still appearing in ATP main draws more than two decades after his first tour-level breakthrough.
          </p>
        </div>
      )}

      {pathname === '/records/oldest-players-in-main-draw-at-grand-slam' && selectedSurfaces?.size === 0 && selectedLevels?.has('G') && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for oldest players in a men’s singles Grand Slam main draw stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Frank Parker</span></span>, who appeared at the <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 1968 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1968 US Open</Link> aged <strong className="!text-amber-300">52 years and 211 days</strong> — the oldest recorded men’s singles main-draw appearance at a major in the Open Era.             The first US Open of the Open Era was played on grass at Forest Hills. Parker entered the main draw and later faced <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Arthur Ashe</span></span>, the eventual champion, losing in the second round — a run remembered far more as an extraordinary longevity marker than as a competitive benchmark.
          </p>

          <p>
            Behind him, the top of the Grand Slam longevity list is shaped by early Open Era veterans and great names from the amateur/professional transition, including <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pancho Gonzales</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Ken Rosewall</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Vic Seixas</span></span>, and later <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>. Each represents a different version of late-career endurance, but none pushed the Grand Slam main-draw ceiling beyond Parker’s 52-year mark.
          </p>
          <p>
            A separate modern reference point is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>. Unlike the older one-off veterans from the early Open Era, Connors remained a genuine tour icon deep into the ATP computer era, making his final Grand Slam singles main-draw appearance at the <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 1992 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1992 US Open</Link> aged <strong className="!text-amber-300">41</strong>. There, he defeated <span className="inline-flex items-center gap-2"><Flag ioc="BRA" className="w-4 h-3" /><span>Jaime Oncins</span></span> in the opening round before losing to <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Ivan Lendl</span></span> in the second round.
          </p>
          <p>
            In this record, the milestone is simply entering the draw: Parker set the extreme Open Era Grand Slam ceiling at over <strong className="!text-amber-300">52 years</strong>, while Connors represents the elite-career version of the record — a former No. 1 and multiple major champion still appearing in Grand Slam main draws more than two decades after his first breakthrough at the top of the sport.
          </p>
        </div>
      )}

      {pathname === '/records/oldest-grand-slam-quarterfinalists' && selectedSurfaces?.size === 0 && selectedLevels?.has('G') && selectedRounds === 'QF' && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for oldest Grand Slam quarterfinalists stands <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Ken Rosewall</span></span>, who reached the <Link href={getTourneyHref({ slug: createSlug('Australian Open 2'), year: 1977 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">December 1977 Australian Open</Link> quarterfinals aged <strong className="!text-amber-300">43 years 47 days</strong> — the oldest recorded men’s singles Grand Slam quarterfinal appearance of the Open Era. Rosewall was born on 2 November 1934, and that Australian Open was played from 19–31 December 1977 on grass in Australia.             In that tournament, Rosewall was seeded No. 4 and reached the last eight before losing to <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>John Alexander</span></span> in the quarterfinals, 7-6, 7-6, 4-6, 6-1. That run came in the second Australian Open staged in 1977 — the December edition won by <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Vitas Gerulaitis</span></span> — and turned Rosewall’s late-career Slam presence into one of the most extreme longevity records in men’s tennis.             Rosewall dominates the very top of this record: earlier in the same year, at the <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 1977 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">January 1977 Australian Open</Link>, he went even further by reaching the semifinals, beating defending champion <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Mark Edmondson</span></span> in the quarterfinals before losing to <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Roscoe Tanner</span></span>.
          </p>
          <p>
            Behind him, another early Open Era giant is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pancho Gonzales</span></span>, who reached the second week at <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 1968 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 1968</Link> aged 40 years 112 days.
          </p>
          <p>
            A separate modern reference point is <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, who reached the <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2021 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2021</Link> quarterfinals aged 39 years and 324 days, becoming the oldest man to reach the Wimbledon last eight in the Open Era before losing to <span className="inline-flex items-center gap-2"><Flag ioc="POL" className="w-4 h-3" /><span>Hubert Hurkacz</span></span> 6-3, 7-6(4), 6-0. Another iconic modern-era marker is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span> at the 1991 US Open, where he turned 39 during the tournament and produced a famous run to the semifinals.
          </p>
          <p>
            In this record, the milestone is not merely entering the draw, but surviving four rounds of best-of-five tennis to reach the last eight: Rosewall set the extreme ceiling at 43, while Federer and Connors represent the modern/iconic versions of the feat — former No. 1s still reaching Grand Slam quarterfinals long after the age at which most champions have left the sport’s biggest stages.
          </p>
        </div>
      )}

      {pathname === '/records/oldest-grand-slam-semifinalists' && selectedSurfaces?.size === 0 && selectedLevels?.has('G') && selectedRounds === 'SF' && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for oldest Grand Slam men’s singles semifinalists stands <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Ken Rosewall</span></span>, who reached the semifinals of the <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 1977 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">January 1977 Australian Open</Link> at age 42 years and 60 days. Rosewall was seeded No. 4 and lost in the semifinals to <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Roscoe Tanner</span></span>, 6-4, 3-6, 6-4, 6-1. The tournament was played at Kooyong from 3 to 9 January 1977, and Rosewall’s run ended one round before the final.
          </p>
          <p>
            Second among the oldest Grand Slam semifinalists is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pancho Gonzales</span></span>, who reached the semifinals at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 1968 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 1968</Link> at age 40. Gonzales was seeded No. 5 and lost to <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Rod Laver</span></span>, 6-3, 6-3, 6-1. The 1968 French Open was the first Grand Slam tournament of the Open Era, played from 27 May to 9 June 1968.
          </p>
          <p>
            Rosewall also appears again near the top of the list for his <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 1974 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1974 US Open</Link> run. At age 39, he defeated <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>John Newcombe</span></span> in the semifinals, 6-7, 6-4, 7-6, 6-3, before losing the final to <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>.
          </p>
          <p>
            In the modern era, the leading name is <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>. At the <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2026 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 2026</Link>, he reached the semifinals at age 38 years 253 days, advancing after <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" /><span>Lorenzo Musetti</span></span> retired in their quarter-final. Djokovic then defeated <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" /><span>Jannik Sinner</span></span> in the semifinal, 3-6, 6-3, 4-6, 6-4, 6-4, to reach his 11th Australian Open final.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span> is another modern entry in this record. At the <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2020 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 2020</Link>, he reached the semifinals at age 38 years 164 days and faced Djokovic in what became their 50th and final professional meeting; Djokovic won 7-6(1), 6-4, 6-3.
          </p>
          <p>
            The record number remains 42: Ken Rosewall is the oldest Grand Slam men’s singles semifinalist of the Open Era, followed by Pancho Gonzales at 40 and Rosewall again at 39. Djokovic and Federer represent the modern part of the list, with semifinal runs deep into their late 30s.
          </p>
        </div>
      )}

      {pathname === '/records/oldest-masters-1000-semifinalists' && selectedSurfaces?.size === 0 && selectedLevels?.has('M') && selectedRounds === 'SF' && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the list for oldest Masters 1000 semifinalists stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, who reached the semifinals of the 2025 Shanghai Masters aged <strong className="!text-amber-300">38 years and 125 days</strong>, becoming the oldest men’s singles semifinalist in ATP Masters 1000 history — a category that formally begins with the series’ launch in 1990.            In Shanghai, Djokovic defeated <span className="inline-flex items-center gap-2"><Flag ioc="BEL" className="w-4 h-3" /><span>Zizou Bergs</span></span> in the quarterfinals, 6-3, 6-4, to reach his 80th career Masters 1000 semifinal, extending his own record at that level. That run pushed the longevity ceiling beyond the mark he had set earlier in the same season at the 2025 Miami Open, where he had become the oldest Masters 1000 semifinalist at 37 years and 10 months after beating <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Sebastian Korda</span></span> 6-3, 7-6(4). 
          </p>
          <p>
            Behind him, the previous gold standard belonged largely to <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, who reached the semifinals at both <Link href="/records/oldest-masters-1000-semifinalists#:~:text=Miami%202019" className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 2019</Link> and <Link href={getTourneyHref({ slug: createSlug('Indian Wells Masters'), year: 2019 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Indian Wells 2019</Link> aged 37 years and 7 months, with the Miami run ending in the title. Other entries near the top of the list include Djokovic at <Link href={getTourneyHref({ slug: createSlug('Shanghai'), year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Shanghai 2024</Link>, Federer at <Link href={getTourneyHref({ slug: createSlug('Paris'), year: 2018 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Paris 2018</Link>, <Link href={getTourneyHref({ slug: createSlug('Shanghai'), year: 2018 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Shanghai 2018</Link>, and <Link href={getTourneyHref({ slug: createSlug('Cincinnati Masters'), year: 2018 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Cincinnati 2018</Link>, while <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John Isner</span></span> was also a notable non-Big-Three marker with his Canada/Toronto 2021 semifinal run aged 36.
          </p>
          <p>
            In this record, the milestone is not simply entering the draw, but surviving an elite Masters 1000 field to reach the final four: Djokovic has set the current ceiling at 38, Federer remains the defining late-career reference before him, and Isner represents the most notable serve-driven longevity case outside the Big Three.
          </p>
        </div>
      )}

      {pathname === '/records/oldest-masters-1000-quarterfinalists' && selectedSurfaces?.size === 0 && selectedLevels?.has('M') && selectedRounds === 'QF' && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the list for oldest Masters 1000 quarterfinalists stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, who reached the quarterfinals of the <Link href="/tournaments/shanghai/2025" className="!text-orange-300 hover:!text-orange-100 font-semibold">2025 Shanghai Masters</Link> aged <strong className="!text-amber-300">38 years and 4 months</strong>, becoming the oldest men’s singles quarterfinalist in ATP Masters 1000 history — a category that formally begins with the series’ launch in 1990.             Djokovic reached that milestone by surviving a demanding fourth-round match against <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Jaume Munar</span></span>, winning 6-3, 5-7, 6-2 in heavy Shanghai humidity and after receiving medical attention during the match. The win sent him into the Shanghai quarterfinals for the 11th time and made him the oldest player ever to reach the last eight of a Masters 1000 event.
          </p>
          <p>
            The previous benchmark belonged to <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, who reached the <Link href="/tournaments/shanghai/2019" className="!text-orange-300 hover:!text-orange-100 font-semibold">2019 Shanghai Masters</Link> quarterfinals aged <strong className="!text-amber-300">38 years and 2 months</strong>, beating <span className="inline-flex items-center gap-2"><Flag ioc="BEL" className="w-4 h-3" /><span>David Goffin</span></span> 7-6(7), 6-4 before losing to <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Alexander Zverev</span></span> in the quarterfinals, 6-3, 6-7(7), 6-3. Federer’s 2019 Shanghai run had stood as the oldest Masters 1000 quarterfinal mark until Djokovic overtook it six years later at the same tournament.
          </p>
          <p>
            Behind the Djokovic–Federer ceiling, another notable longevity reference is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John Isner</span></span>, who reached multiple Masters 1000 quarterfinals in his mid-thirties, including Canada/Toronto 2021, where he beat <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Gaël Monfils</span></span> 7-6(5), 6-4 in the quarterfinals to reach the semifinals. Isner’s case is a different kind of longevity marker: less about all-court dominance and more about the extreme durability of a serve-driven game at Masters 1000 level,
          </p>
          <p>
            In this record, the milestone is not simply entering the draw, but surviving enough elite-level matches to reach the last eight: Djokovic set the current ceiling at 38 years and 4 months, Federer represents the previous gold standard, and Isner stands as the strongest non-Big-Three late-career reference point in the modern Masters era.
          </p>
        </div>
      )}

      {pathname === '/records/oldest-grand-slam-finalists' && selectedSurfaces?.size === 0 && selectedLevels?.has('G') && selectedRounds === 'F' && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for oldest men’s singles Grand Slam finalists stands <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Ken Rosewall</span></span>, who reached the <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 1974 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1974 US Open</Link> final aged <strong className="!text-amber-300">39 years, 10 months and 6 days</strong> — the oldest recorded men’s singles finalist at a major in the Open Era.             Born on 2 November 1934, Rosewall was beaten by <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span> in the Forest Hills final, 6-1, 6-0, 6-1, on grass.

          </p>
          <p>
            Rosewall dominates this record more than anyone else: only a few weeks earlier, he had also reached the <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 1974 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1974 Wimbledon</Link> final aged 39 years and 8 months, again losing to Connors, this time 6-1, 6-1, 6-4. That 1974 double — <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 1974 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link> and <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 1974 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link> finalist at 39 — remains one of the most extraordinary late-career peaks in Grand Slam history, especially because Rosewall was still beating elite players deep into majors.
          </p>
                    <p>
            Another contemporary longevity marker is <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, who reached the <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2026 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2026 Australian Open</Link> final aged <strong className="!text-amber-300">38 years and 255 days</strong>, losing to <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Carlos Alcaraz</span></span> 6-2, 6-2, 7-6(4).
          </p>
          <p>
            A separate modern reference point is <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, who made his final Grand Slam singles final at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2019 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2019</Link> aged <strong className="!text-amber-300">37 years and 11 months</strong>, losing an epic final to <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span> 7-6(5), 1-6, 7-6(4), 4-6, 13-12(3).
          </p>

          <p>
            In this record, the milestone is not simply entering the draw, but surviving two full weeks and reaching the championship match: Rosewall set the Open Era ceiling at almost 40, while Federer and Djokovic represent the modern elite-career version of the record — all-time greats still reaching Grand Slam finals deep into their late thirties.
          </p>
        </div>
      )}

      {pathname === '/records/oldest-masters-1000-finalists' && selectedSurfaces?.size === 0 && selectedLevels?.has('M') && selectedRounds === 'F' && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            For the strict ATP Masters 1000 era, which begins with the series’ launch in 1990, the benchmark for oldest Masters 1000 finalists now belongs to <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, who reached the <Link href={getTourneyHref({ slug: createSlug('Miami Masters'), year: 2025 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2025 Miami Masters</Link> final aged <strong className="!text-amber-300">37 years and 10 months</strong>, becoming the oldest Masters 1000 finalist in series history and overtaking Roger Federer’s 2019 Miami mark.
          </p>
          <p>
            Before Djokovic, the key modern reference point was <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, who reached and won the <Link href={getTourneyHref({ slug: createSlug('Miami Masters'), year: 2019 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2019 Miami Masters</Link> final aged <strong className="!text-amber-300">37 years, 7 months and 23 days</strong>, beating <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John Isner</span></span> 6-1, 6-4 for his fourth Miami title, his 28th and final Masters 1000 title, and his 101st career title. Federer had also reached the 2019 Indian Wells final two weeks earlier, underlining how extraordinary that late-career spring run was.
          </p>
          <p>
            Behind them, other major longevity markers include <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, finalist at <Link href={getTourneyHref({ slug: createSlug('Indian Wells Masters'), year: 2022 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Indian Wells 2022</Link> aged <strong className="!text-amber-300">35 years 277 days</strong>, where he lost to <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Taylor Fritz</span></span> 6-3, 7-6(5), and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span>, finalist at the <Link href={getTourneyHref({ slug: createSlug('Canada Masters'), year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2005 Canada Masters</Link> aged 35 years 101 days, where he lost to a teenage <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> 6-3, 4-6, 6-2.
          </p>
          <p>
            In this record, the milestone is not simply entering the draw, but surviving a full elite Masters 1000 field to reach the title match: Djokovic set the current ceiling at 37 years and 10 months, Federer represents the previous gold standard of late-career Masters excellence, while Nadal and Agassi show how rare it is for even all-time greats to remain finalists at this level deep into their mid-thirties.
          </p>
        </div>
      )}

      {pathname === '/records/oldest-players-in-main-draw-at-masters-1000' && selectedSurfaces?.size === 0 && selectedLevels?.has('M') && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the list for oldest players in a Masters 1000 main draw stands <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Stan Wawrinka</span></span>, who appeared at the <Link href={getTourneyHref({ slug: createSlug('Monte-Carlo Masters'), year: 2026 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2026 Monte-Carlo Masters</Link> aged <strong className="!text-amber-300">41 years and 9 days</strong>, becoming the oldest recorded men’s singles main-draw player at Masters 1000 level.             In that opening-round match Wawrinka faced <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Sebastian Baez</span></span> on clay and lost <strong className="!text-amber-300">7-5, 7-5</strong>. It was his final appearance at Monte-Carlo, the tournament where he had won his lone Masters 1000 title in 2014, and the result turned Monte-Carlo 2026 into a pure longevity milestone rather than a competitive benchmark.
          </p>
          <p>
            Behind him, the key historical reference is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>, who played the <Link href={getTourneyHref({ slug: createSlug('Miami Masters'), year: 1993 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1993 Miami Masters</Link> aged <strong className="!text-amber-300">40 years and 191 days</strong>, holding the benchmark for more than three decades before Wawrinka pushed the ceiling beyond 41.
          </p>
          <p>
            Another major modern longevity marker is <span className="inline-flex items-center gap-2"><Flag ioc="CRO" className="w-4 h-3" /><span>Ivo Karlovic</span></span>, who appeared in Masters 1000 main draws after turning 40, including <Link href={getTourneyHref({ slug: createSlug('Cincinnati Masters'), year: 2019 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Cincinnati Masters 2019</Link> aged <strong className="!text-amber-300">40 years and 165 days</strong>, where he lost to <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Jan-Lennard Struff</span></span> 7-5, 7-6(4). A separate competitive reference point is also Karlovic at <Link href={getTourneyHref({ slug: createSlug('Indian Wells Masters'), year: 2019 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Indian Wells Masters 2019</Link>: by beating <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Matthew Ebden</span></span> shortly after turning 40, he became the oldest player to win a Masters 1000 singles match since the series began in 1990, later defeating <span className="inline-flex items-center gap-2"><Flag ioc="CRO" className="w-4 h-3" /><span>Borna Coric</span></span> as well in the same tournament.
          </p>
          <p>
            In this record, the milestone is simply entering the draw: Wawrinka set the current Masters 1000 ceiling at 41, Connors represents the bridge from the early ATP computer era into the modern Masters structure, and Karlovic stands as the most extreme serve-driven longevity case — not just appearing after 40, but still winning matches at one of the tour’s highest levels.
          </p>
        </div>
      )}

      {pathname === '/records/oldest-players-in-main-draw-on-hard-court' && selectedSurfaces?.has('Hard') && selectedLevels?.size === 0 && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for oldest players in an ATP men’s singles main draw on hard court stands <span className="inline-flex items-center gap-2"><Flag ioc="IRL" className="w-4 h-3" /><span>James McArdle</span></span>, who appeared at <Link href={getTourneyHref({ slug: createSlug('Dublin'), year: 1974 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Dublin 1974</Link> aged <strong className="!text-amber-300">54 years and 67 days</strong>, the oldest recorded hard-court main-draw appearance in this surface-specific ranking.             McArdle also holds second place on the same list, having played <Link href={getTourneyHref({ slug: createSlug('Dublin'), year: 1973 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Dublin 1973</Link> aged <strong className="!text-amber-300">53 years and 68 days</strong>, making him the dominant figure at the very top of the hard-court longevity table.
          </p>
          <p>
            Behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="ECU" className="w-4 h-3" /><span>Pancho Segura</span></span>, another early Open Era veteran, who appears twice among the leading entries: at <Link href={getTourneyHref({ slug: createSlug('Carlsbad WCT'), year: 1974 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Carlsbad WCT 1974</Link> aged <strong className="!text-amber-300">52 years and 249 days</strong>, and at <Link href={getTourneyHref({ slug: createSlug('Kingston'), year: 1971 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Kingston 1971</Link> aged <strong className="!text-amber-300">50 years and 175 days</strong>.
          </p>
          <p>
            The hard-court record therefore has a different shape from the all-surface list: rather than Gardnar Mulloy’s overall longevity ceiling, the surface-specific benchmark belongs to McArdle, with <Link href={getTourneyHref({ slug: createSlug('Dublin'), year: 1974 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Dublin 1974</Link> standing as the oldest recorded ATP men’s singles main-draw appearance on hard court.
          </p>
        </div>
      )}

      {pathname === '/records/oldest-players-in-main-draw-on-clay-court' && selectedSurfaces?.has('Clay') && selectedLevels?.size === 0 && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list for oldest players in an ATP men’s singles main draw on clay court stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Gardnar Mulloy</span></span>, who appeared at <Link href={getTourneyHref({ slug: createSlug('Miami'), year: 1977 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 1977</Link> aged <strong className="!text-amber-300">63 years and 77 days</strong>, the oldest recorded clay-court main-draw appearance of the Open Era. In that match, Mulloy faced <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John Whitlinger</span></span> in the Round of 32, losing 6-0, 6-1 on outdoor clay — a result that makes <Link href={getTourneyHref({ slug: createSlug('Miami'), year: 1977 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 1977</Link> the ultimate clay-court longevity milestone rather than a competitive benchmark. Mulloy dominates the very top of this surface-specific record: he also appears at <Link href={getTourneyHref({ slug: createSlug('Fort Lauderdale'), year: 1971 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Fort Lauderdale 1971</Link> aged <strong className="!text-amber-300">57 years and 56 days</strong>, <Link href={getTourneyHref({ slug: createSlug('Jacksonville'), year: 1970 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Jacksonville 1970</Link> aged <strong className="!text-amber-300">56 years and 123 days</strong>, <Link href={getTourneyHref({ slug: createSlug('Monte-Carlo'), year: 1969 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Monte-Carlo 1969</Link> aged <strong className="!text-amber-300">55 years and 143 days</strong>, <Link href={getTourneyHref({ slug: createSlug('Jacksonville'), year: 1969 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Jacksonville 1969</Link> aged <strong className="!text-amber-300">55 years and 131 days</strong>, and <Link href={getTourneyHref({ slug: createSlug('St. Petersburg'), year: 1969 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">St. Petersburg 1969</Link> aged <strong className="!text-amber-300">55 years and 115 days</strong>.
          </p>
          <p>
            Behind him come other early Open Era veterans such as <span className="inline-flex items-center gap-2"><Flag ioc="HUN" className="w-4 h-3" /><span>Jozsef Asboth</span></span>, aged <strong className="!text-amber-300">51 years and 306 days</strong> at <Link href={getTourneyHref({ slug: createSlug('Munich'), year: 1969 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Munich 1969</Link>, and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Frederick “Ted” Schroeder</span></span>, aged <strong className="!text-amber-300">51 years and 4 days</strong> at <Link href={getTourneyHref({ slug: createSlug('Louisville WCT'), year: 1972 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Louisville WCT 1972</Link>.
          </p>
          <p>
            In this record, as with the overall list, the milestone is simply entering the draw — a rare example of early Open Era longevity extending beyond age 50 on a single surface.
          </p>
        </div>
      )}

      {pathname === '/records/oldest-players-in-main-draw-on-grass-court' && selectedSurfaces?.has('Grass') && selectedLevels?.size === 0 && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the grass-court list for oldest ATP men’s singles main-draw appearances stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Frank Parker</span></span>, who played the <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 1968 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 1968</Link> aged <strong className="!text-amber-300">52 years and 211 days</strong>. Parker’s grass-court milestone is the oldest recorded men’s main-draw appearance on this surface in the Open Era. His record leads a list dominated by early grass specialists and late-career veterans whose competitive windows extended into their fifties.
          </p>
          <p>
            In second place is <span className="inline-flex items-center gap-2"><Flag ioc="IRL" className="w-4 h-3" /><span>James McArdle</span></span>, who appears at <Link href={getTourneyHref({ slug: createSlug('Dublin'), year: 1972 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Dublin 1972</Link> aged <strong className="!text-amber-300">52 years and 70 days</strong> and again at <Link href={getTourneyHref({ slug: createSlug('Dublin'), year: 1971 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Dublin 1971</Link> aged <strong className="!text-amber-300">51 years and 64 days</strong>.
          </p>
          <p>
            The grass-court rankings also include multiple entries from <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>E. Victor Seixas</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="ECU" className="w-4 h-3" /><span>Pancho Segura</span></span>, showing that sustained grass-court longevity was often built around several late-career appearances rather than a single singular event.
          </p>
          <p>
            In this surface-specific record, the milestone is not necessarily winning the title; it is simply returning to the grass-court main draw again and again, year after year, at an age when most players had long since left the tour.
          </p>
        </div>
      )}

      {pathname === '/records/oldest-players-in-main-draw-on-carpet-court' && selectedSurfaces?.has('Carpet') && selectedLevels?.size === 0 && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the carpet-court list for oldest ATP men’s singles main-draw appearances stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Frank Parker</span></span>, who played <Link href={getTourneyHref({ slug: createSlug('Hampton'), year: 1971 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Hampton 1971</Link> aged <strong className="!text-amber-300">55 years and 30 days</strong>. 
            Parker’s carpet milestone is a record of staying power on a surface that rewarded fast reflexes and experience.
          </p>
          Behind him sits <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Tom Brown</span></span>, who appeared at <Link href={getTourneyHref({ slug: createSlug('Albany'), year: 1972 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Albany 1972</Link> aged <strong className="!text-amber-300">49 years and 364 days</strong>.
          <p>
            The leading carpet entries are rounded out by the remarkable late-career tournament presence of <span className="inline-flex items-center gap-2"><Flag ioc="ECU" className="w-4 h-3" /><span>Pancho Segura</span></span>, whose multiple appearances at <Link href={getTourneyHref({ slug: createSlug('Anaheim'), year: 1969 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Anaheim</Link>, <Link href={getTourneyHref({ slug: createSlug('New York'), year: 1969 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">New York</Link>, <Link href={getTourneyHref({ slug: createSlug('Los Angeles'), year: 1969 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Los Angeles</Link> and <Link href={getTourneyHref({ slug: createSlug('Philadelphia'), year: 1969 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Philadelphia</Link> in <strong className="!text-amber-300">1969</strong> show that carpet longevity could be built across a wide array of indoor events.
          </p>
          <p>
            In this record, the milestone is not the match score but the ability to keep entering carpet main draws as the tour shifted toward faster indoor courts. Parker’s benchmark at Hampton stands as the clearest expression of that era’s oldest competitive carpet-court presence.
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

      <Modal show={showModal} onClose={() => setShowModal(false)} title="Oldest Player in Main Draw">
        {renderTable(data)}
      </Modal>
        </>
      ) : (
        <div className="text-center py-8 text-gray-300">No data available.</div>
      )}
    </section>
  );
}
