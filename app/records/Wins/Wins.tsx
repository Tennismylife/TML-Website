"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import Link from "next/link";
import Flag from '@/components/Flag';
import { playerMatchesUrl, playerSurfaceHref, surfaceFromSelection } from '../nav';
import { getPlayerHref, getTourneyHref, createSlug } from '@/lib/utils';
import Pagination from "../../../components/Pagination";
import Modal from "@/components/Modal";
import { playerUrl } from "../nav";

interface Winner {
  id: string;
  name: string;
  ioc?: string;
  wins: number;
  slug?: string | null;
}

interface GrandSlamContext {
  latestTourneyName: string;
  latestTourneyYear: number | null;
  wins?: number;
}

interface Masters1000Context {
  wins: number;
  losses: number;
  latestTourneyName: string;
  latestTourneyYear: number | null;
}

interface CareerContext {
  wins: number;
  losses: number;
}

interface HardCourtContext {
  wins: number;
}

interface WinsProps {
  topWinners?: Winner[];
  grandSlamContext?: GrandSlamContext | null;
  masters1000Context?: Masters1000Context | null;
  careerContext?: CareerContext | null;
  hardCourtContext?: HardCourtContext | null;
  fetchEnabled?: boolean;
  description?: string;
  selectedSurfaces?: Set<string>;
  selectedLevels?: Set<string>;
  selectedRounds?: string;
  selectedBestOf?: number | null;
  selectedTopN?: number | null;
  canonicalUrl?: string;
}

export default function Wins({ topWinners, grandSlamContext: initialGrandSlamContext, masters1000Context: initialMasters1000Context, careerContext, hardCourtContext, fetchEnabled, description, selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, selectedTopN: initialTopN, canonicalUrl }: WinsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [allWinners, setAllWinners] = useState<Winner[]>(topWinners || []);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(!(topWinners && topWinners.length > 0));
  const [error, setError] = useState<string | null>(null);
  const [grandSlamContext, setGrandSlamContext] = useState<GrandSlamContext | null>(initialGrandSlamContext ?? null);
  const [masters1000Context, setMasters1000Context] = useState<Masters1000Context | null>(initialMasters1000Context ?? null);
  const [careerContextState, setCareerContextState] = useState<CareerContext | null>(careerContext ?? null);
  const [hardCourtContextState, setHardCourtContextState] = useState<HardCourtContext | null>(hardCourtContext ?? null);
  const [showModal, setShowModal] = useState(false);
  const [selectedTopN, setSelectedTopN] = useState<number | null>(initialTopN ?? null);
  const perPage = 20;
  const surfaceLink = surfaceFromSelection(selectedSurfaces);

  useEffect(() => {
    const handler = (e: Event) => { if ((e as CustomEvent)?.detail?.resetPage) setPage(1); };
    window.addEventListener('records:reset', handler as EventListener);
    return () => window.removeEventListener('records:reset', handler as EventListener);
  }, []);

  // Only fetch when showModal changes (for view all feature)
  // Filter changes are handled by server-side navigation, not client-side fetching
  useEffect(() => {
    // Skip fetch if data was prefetched and showModal hasn't changed
    if (!fetchEnabled && !showModal) {
      return;
    }

    const controller = new AbortController();
    const fetchWinners = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedSurfaces) selectedSurfaces.forEach(s => params.append('surface', s));
        if (selectedLevels) selectedLevels.forEach(l => params.append('level', l));
        if (selectedRounds) params.set('round', selectedRounds);
        if (selectedBestOf != null) params.set('bestOf', String(selectedBestOf));
        if (selectedTopN != null) params.set('top', String(selectedTopN));
        params.set('perPage', showModal ? '1000' : '100');
        params.delete('page');

        const res = await fetch(`/api/records/wins?${params.toString()}`, { signal: controller.signal });
        const data = await res.json();
        if (!controller.signal.aborted) {
          setAllWinners(data.topWinners || []);
          setGrandSlamContext(data.grandSlamContext ?? null);
          setMasters1000Context(data.masters1000Context ?? null);
          setCareerContextState(data.careerContext ?? null);
          setHardCourtContextState(data.hardCourtContext ?? null);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') console.error(err);
        if (!controller.signal.aborted) {
          setAllWinners([]);
          setGrandSlamContext(null);
          setMasters1000Context(null);
          setError(err?.message || 'Error loading data');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchWinners();
    return () => controller.abort();
  }, [showModal]);

  if (loading)
    return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!allWinners.length) {
    const msg = selectedTopN != null
      ? `No career wins against top ${selectedTopN} opponents.`
      : 'No data available.';
    return <div className="text-center py-8 text-gray-300">{msg}</div>;
  }

  const totalCount = allWinners.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const winners = allWinners.slice(start, end);
  const hasRows = allWinners.length > 0;

  const renderTable = (winnersList: Winner[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Wins</th>
          </tr>
        </thead>
        <tbody>
          {winnersList.map((p, idx) => {
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
                  <Link href={playerMatchesUrl(p.slug ?? String(p.id), (() => { const params: Record<string, string | string[]> = { result: 'Win' }; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (key === 'bestOf') { const bestOfValues = value.split(',').filter(Boolean); const boMap: Record<string,string> = { '1': 'All+Best+of+1', '3': 'All+Best+of+3', '5': 'All+Best+of+5' }; if (bestOfValues.length === 1) params['set'] = boMap[bestOfValues[0]]; } else { if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } } return params; })())} className="text-indigo-300 hover:underline">
                    {p.wins}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Render table of winners
  const renderIntro = () => {
    const toMastersSlug = (name?: string) => {
      const n = (name ?? '').toLowerCase();
      if (n.includes('indian wells')) return 'indian-wells-masters';
      if (n.includes('miami')) return 'miami-masters';
      if (n.includes('monte')) return 'monte-carlo-masters';
      if (n.includes('madrid')) return 'madrid-masters';
      if (n.includes('rome') || n.includes('italian open')) return 'rome-masters';
      if (n.includes('canada') || n.includes('montreal') || n.includes('toronto')) return 'canada-masters';
      if (n.includes('cincinnati')) return 'cincinnati-masters';
      if (n.includes('shanghai')) return 'shanghai';
      if (n.includes('paris')) return 'paris-masters';
      return createSlug(name ?? '');
    };

    const grandSlamDjokovic = allWinners.find((p) => p.name === 'Novak Djokovic');
    const grandSlamDjokovicWins = grandSlamContext?.wins ?? grandSlamDjokovic?.wins ?? null;
    const latestSlamName = grandSlamContext?.latestTourneyName || 'Australian Open';
    const latestSlamYear = grandSlamContext?.latestTourneyYear;
    const mastersDjokovic = allWinners.find((p) => p.name === 'Novak Djokovic');
    const latestMastersName = masters1000Context?.latestTourneyName || 'Mutua Madrid Open';
    const latestMastersYear = masters1000Context?.latestTourneyYear;
    const bestOf3Djokovic = allWinners.find((p) => p.name === 'Novak Djokovic');
    const bestOf5Djokovic = allWinners.find((p) => p.name === 'Novak Djokovic');
    const latestMastersSlug = toMastersSlug(latestMastersName);
    const latestMastersHref = latestMastersYear
      ? getTourneyHref({ slug: latestMastersSlug, year: latestMastersYear })
      : null;
    const mastersDjokovicWins = mastersDjokovic?.wins ?? masters1000Context?.wins ?? 420;
    const mastersDjokovicLosses = masters1000Context?.losses ?? 96;
    const hardCourtDjokovic = allWinners.find((p) => p.name === 'Novak Djokovic');
    const hardCourtFederer = allWinners.find((p) => p.name === 'Roger Federer');
    const isHardCourtOnly = selectedSurfaces?.size === 1 && selectedSurfaces.has('Hard') && (!selectedLevels || selectedLevels.size === 0) && !selectedRounds && selectedBestOf == null && selectedTopN == null;
    const isClayCourtOnly = selectedSurfaces?.size === 1 && selectedSurfaces.has('Clay') && (!selectedLevels || selectedLevels.size === 0) && !selectedRounds && selectedBestOf == null && selectedTopN == null;
    const isGrassCourtOnly = selectedSurfaces?.size === 1 && selectedSurfaces.has('Grass') && (!selectedLevels || selectedLevels.size === 0) && !selectedRounds && selectedBestOf == null && selectedTopN == null;
    const isCarpetCourtOnly = selectedSurfaces?.size === 1 && selectedSurfaces.has('Carpet') && (!selectedLevels || selectedLevels.size === 0) && !selectedRounds && selectedBestOf == null && selectedTopN == null;
    const isGrandSlamOnly = selectedLevels?.size === 1 && selectedLevels.has('G') && (!selectedSurfaces || selectedSurfaces.size === 0) && !selectedRounds && selectedBestOf == null && selectedTopN == null;
    const isMasters1000Only = selectedLevels?.size === 1 && selectedLevels.has('M') && (!selectedSurfaces || selectedSurfaces.size === 0) && !selectedRounds && selectedBestOf == null && selectedTopN == null;
    const isBestOf3Only = selectedBestOf === 3 && (!selectedSurfaces || selectedSurfaces.size === 0) && (!selectedLevels || selectedLevels.size === 0) && !selectedRounds && selectedTopN == null;
    const isBestOf5Only = selectedBestOf === 5 && (!selectedSurfaces || selectedSurfaces.size === 0) && (!selectedLevels || selectedLevels.size === 0) && !selectedRounds && selectedTopN == null;
    const isDavisCupOnly = selectedLevels?.size === 1 && selectedLevels.has('D') && (!selectedSurfaces || selectedSurfaces.size === 0) && !selectedRounds && selectedBestOf == null && selectedTopN == null;
    const isATP250Only = selectedLevels?.size === 1 && selectedLevels.has('250') && (!selectedSurfaces || selectedSurfaces.size === 0) && !selectedRounds && selectedBestOf == null && selectedTopN == null;
    const isATP500Only = selectedLevels?.size === 1 && selectedLevels.has('500') && (!selectedSurfaces || selectedSurfaces.size === 0) && !selectedRounds && selectedBestOf == null && selectedTopN == null;
    const atp500Zverev = allWinners.find((p) => p.name === 'Alexander Zverev');
    const atp500Djokovic = allWinners.find((p) => p.name === 'Novak Djokovic');
    if (isBestOf3Only) {
      return (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            The best-of-3 match win leaderboard is led by <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href={getPlayerHref('jimmy-connors')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Jimmy Connors</Link></span>, with <strong className="!text-amber-300">981</strong> wins. This record captures the players who won the most three-setter matches across all tour levels and surfaces.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><Link href={getPlayerHref('roger-federer')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span> is second with <strong className="!text-amber-300">827</strong> best-of-3 wins, followed by <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><Link href={getPlayerHref('ivan-lendl')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Ivan Lendl</Link></span> at <strong className="!text-amber-300">761</strong> and <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><Link href={getPlayerHref('novak-djokovic')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Novak Djokovic</Link></span> at <strong className="!text-amber-300">{bestOf3Djokovic?.wins ?? 736}</strong>. These totals reflect a mix of historic volume and modern dominance in the most common ATP match format.
          </p>
          <p>
            The best-of-3 record is about volume and durability rather than a single big title run. It rewards players who repeatedly won the shorter format across day matches, week-long events and the full ATP schedule, rather than only the longer Grand Slam battles.
          </p>
        </div>
      );
    }

    if (isBestOf5Only) {
      return (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            The best-of-5 match win leaderboard is led by <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><Link href={getPlayerHref('novak-djokovic')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Novak Djokovic</Link></span>, with <strong className="!text-amber-300">{bestOf5Djokovic?.wins ?? 432}</strong> wins. This record reflects mastery in the longest standard match format, where endurance and resilience are paramount.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><Link href={getPlayerHref('roger-federer')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span> is second with <strong className="!text-amber-300">424</strong> best-of-5 wins, with <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href={getPlayerHref('rafael-nadal')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rafael Nadal</Link></span> third on <strong className="!text-amber-300">345</strong> and <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><Link href={getPlayerHref('ivan-lendl')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Ivan Lendl</Link></span> fourth on <strong className="!text-amber-300">307</strong>. These players are the true volume winners in the five-set world, combining peak performance with the ability to win long, physically demanding matches.
          </p>
          <p>
            Best-of-5 match wins are a different measure from the shorter formats: they reward players who could repeatedly win extended matches in Grand Slams, Davis Cup finals and other long-format events. This list highlights the greatest competitors in tennis’ most enduring battles.
          </p>
          <p>
            Use the filters to see how these totals shift by surface, tournament level and round. The best-of-5 leaderboard is where the sport’s strongest finishers and deepest competitors are best represented.
          </p>
        </div>
      );
    }

    if (isDavisCupOnly) {
      return (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            The Open Era Davis Cup match win record belongs to <span className="inline-flex items-center gap-2"><Flag ioc="ROU" className="w-4 h-3" /><Link href={getPlayerHref('ilie-nastase')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Ilie Nastase</Link></span>, who collected <strong className="!text-amber-300">72</strong> Davis Cup match wins between <strong className="!text-amber-300">1968</strong> and <strong className="!text-amber-300">1983</strong>. His record is the benchmark for national-team longevity and remains the highest in the Open Era for this team competition.
          </p>
          <p>
            Second on the leaderboard is <span className="inline-flex items-center gap-2"><Flag ioc="GEO" className="w-4 h-3" /><Link href={getPlayerHref('alex-metreveli')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Alex Metreveli</Link></span> with <strong className="!text-amber-300">51</strong> Davis Cup wins. A tight group follows with <span className="inline-flex items-center gap-2"><Flag ioc="FIN" className="w-4 h-3" /><Link href={getPlayerHref('jarkko-nieminen')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Jarkko Nieminen</Link></span>, <span className="inline-flex items-center gap-2"><Flag ioc="HUN" className="w-4 h-3" /><Link href={getPlayerHref('balazs-taroczy')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Balazs Taroczy</Link></span> and <span className="inline-flex items-center gap-2"><Flag ioc="IND" className="w-4 h-3" /><Link href={getPlayerHref('leander-paes')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Leander Paes</Link></span> all tied on <strong className="!text-amber-300">48</strong> wins.
          </p>
          <p>
            This page highlights how Davis Cup match wins measure national-team contribution rather than individual tour success. Success in Davis Cup often depends on being available for ties over many years, winning key rubbers in singles and doubles, and adapting to home-and-away surfaces and pressure situations.
          </p>
        </div>
      );
    }

    if (isATP250Only) {
      return (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            The all-time leader for ATP 250 match wins is <span className="inline-flex items-center gap-2"><Flag ioc="AUT" className="w-4 h-3" /><Link href={getPlayerHref('thomas-muster')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Thomas Muster</Link></span>, who accumulated <strong className="!text-amber-300">266</strong> victories at this level across a single decade, from <strong className="!text-amber-300">1990</strong> to <strong className="!text-amber-300">1999</strong>. His total includes the ATP International Series tournaments of the 1990s, when the smaller-circuit events still formed the backbone of the tour's volume schedule. The Austrian clay-court specialist built his record by competing relentlessly on the smaller-tournament circuit, treating ATP 250 events as a proving ground before becoming one of the dominant clay players of the 1990s.
          </p>
          <p>
            In second place is <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><Link href={getPlayerHref('richard-gasquet')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Richard Gasquet</Link></span> with <strong className="!text-amber-300">256</strong> wins — and, remarkably, his career stretches from <strong className="!text-amber-300">2003</strong> to <strong className="!text-amber-300">2025</strong>, making him the longest-tenured player in this ranking. Gasquet never reached the heights of the Big Three at the majors or Masters events, but his durability and consistency at the ATP 250 level across more than two decades made him a near-permanent presence on this leaderboard.
          </p>
          <p>
            Behind them, <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href={getPlayerHref('carlos-moya')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Carlos Moya</Link></span> ranks third with <strong className="!text-amber-300">246</strong> wins (<strong className="!text-amber-300">1995–2010</strong>), and <span className="inline-flex items-center gap-2"><Flag ioc="RUS" className="w-4 h-3" /><Link href={getPlayerHref('yevgeny-kafelnikov')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Yevgeny Kafelnikov</Link></span> is fourth with <strong className="!text-amber-300">243</strong> (<strong className="!text-amber-300">1992–2003</strong>). Both were Grand Slam champions who maintained a high workrate throughout their careers, playing deeply at smaller tournaments as well as on the biggest stages.
          </p>
          <p>
            The ATP 250 leaderboard is notably different in character from the Masters 1000 or Grand Slam equivalents: it rewards longevity and volume over peak domination. <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><Link href={getPlayerHref('roger-federer')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span>, for instance, appears only at <strong className="!text-amber-300">20th</strong> place with <strong className="!text-amber-300">195</strong> wins — a reflection of his deliberate choice to reduce his schedule at smaller events as his career progressed. The Big Three generally preferred to conserve energy for the elite tier.
          </p>
        </div>
      );
    }

    if (isATP500Only) {
      return (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            The all-time leader for ATP 500 match wins is <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><Link href={getPlayerHref('roger-federer')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span>, with <strong className="!text-amber-300">178</strong> victories at this level from <span className="text-white font-semibold">1999</span> to <span className="text-white font-semibold">2021</span>. His dominance at ATP 500 events is no coincidence: he regularly played tournaments like <Link href={getTourneyHref({ slug: createSlug('Halle') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Halle</Link>, <Link href={getTourneyHref({ slug: createSlug('Dubai') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Dubai</Link>, and <Link href={getTourneyHref({ slug: createSlug('Basel') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Basel</Link> as near-certain title contenders, building victories consistently across two decades of peak performance. That total also reaches back into the ATP International Series Gold tournaments of the 1990s, before the 500-level branding existed. Unlike at Masters 1000 level, where Djokovic eventually surpassed him, Federer's ATP 500 record remains untouched.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href={getPlayerHref('rafael-nadal')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rafael Nadal</Link></span> is second with <strong className="!text-amber-300">171</strong> wins (<span className="text-white font-semibold">2003–2024</span>), followed by an unexpected name at third: <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href={getPlayerHref('david-ferrer')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">David Ferrer</Link></span> with <strong className="!text-amber-300">153</strong> wins (<span className="text-white font-semibold">2003–2019</span>). Ferrer's presence above Djokovic and Murray in this ranking reflects his exceptional consistency at mid-tier events throughout his career — a player who rarely skipped ATP 500 tournaments and made a habit of advancing deep into their draws.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="GER" className="w-4 h-3" /><Link href={getPlayerHref('alexander-zverev')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Alexander Zverev</Link></span> sits fourth with <strong className="!text-amber-300">{atp500Zverev?.wins ?? 121}</strong> wins (<span className="text-white font-semibold">2014–2026</span>) and is the leading active contender to climb this ranking further. His place above Djokovic reflects the fact that he has built up a stronger ATP 500 record across a still-active career.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><Link href={getPlayerHref('novak-djokovic')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Novak Djokovic</Link></span> sits fifth with <strong className="!text-amber-300">{atp500Djokovic?.wins ?? 118}</strong> wins. His comparatively lower position reflects the degree to which he prioritised Grand Slams and Masters 1000 events over the course of his career, often reducing his ATP 500 schedule in later seasons to manage his workload. Behind him, <span className="inline-flex items-center gap-2"><Flag ioc="RUS" className="w-4 h-3" /><Link href={getPlayerHref('andrey-rublev')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Andrey Rublev</Link></span> ranks sixth with <strong className="!text-amber-300">116</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="JPN" className="w-4 h-3" /><Link href={getPlayerHref('kei-nishikori')} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Kei Nishikori</Link></span> is seventh with <strong className="!text-amber-300">105</strong> — the latter a testament to Nishikori's remarkable longevity on tour.
          </p>
        </div>
      );
    }

    if (isMasters1000Only) {
      return (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the leaderboard stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Novak Djokovic'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Novak Djokovic</Link></span>, with an official ATP Masters 1000 record of <strong className="!text-amber-300">{mastersDjokovicWins}</strong> wins and <strong className="!text-amber-300">{mastersDjokovicLosses}</strong> losses, updated after {latestMastersHref ? <Link href={latestMastersHref} className="!text-orange-300 hover:!text-orange-100 font-semibold">{latestMastersYear} {latestMastersName}</Link> : <strong className="!text-orange-300">{latestMastersYear ? `${latestMastersYear} ` : ''}{latestMastersName}</strong>}. He leads <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Rafael Nadal'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rafael Nadal</Link></span>, who finished with <strong className="!text-amber-300">410</strong> wins, and <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Roger Federer'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span>, who ended his Masters career with <strong className="!text-amber-300">381</strong> wins.
          </p>
          <p>
            Djokovic became the all-time Masters 1000 match-wins leader at the <Link href={getTourneyHref({ slug: 'miami-masters', year: 2025 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2025 Miami Open</Link>, when he defeated <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Camilo Ugo Carabelli'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Camilo Ugo Carabelli</Link></span> 6-1, 7-6(1) to record his <strong className="!text-amber-300">411th</strong> Masters 1000 win, moving past Nadal's previous mark of <strong className="!text-amber-300">410</strong>. His first Masters 1000 match win came at the <Link href={getTourneyHref({ slug: 'paris-masters', year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2005 Paris Masters</Link>, and his record has continued to grow across the modern Masters calendar.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Rafael Nadal'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rafael Nadal</Link></span> is second with <strong className="!text-amber-300">410</strong> Masters 1000 match wins. His total is built on two different strengths: unmatched dominance in the clay Masters and strong results on hard courts. Nadal won his first Masters 1000 match at <Link href={getTourneyHref({ slug: 'monte-carlo-masters', year: 2003 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2003 Monte-Carlo</Link>, and his final Masters 1000 victory came at <Link href={getTourneyHref({ slug: 'rome-masters', year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2024 Italian Open</Link>. He remains the leader in Masters 1000 win percentage among players with at least <strong className="!text-amber-300">100</strong> wins, with a <strong className="!text-amber-300">410–90</strong> record and an <strong className="!text-amber-300">82.0%</strong> win rate.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Roger Federer'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span> ranks third with <strong className="!text-amber-300">381</strong> Masters 1000 wins. His first Masters 1000 match win came at the <Link href={getTourneyHref({ slug: 'miami-masters', year: 2000 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2000 Miami Open</Link>, and his last came at the <Link href={getTourneyHref({ slug: 'shanghai', year: 2019 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2019 Shanghai Masters</Link>. Federer's Masters record is especially tied to hard courts: he won more matches at <Link href={getTourneyHref({ slug: 'indian-wells-masters' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Indian Wells</Link> than at any other Masters 1000 event, with <strong className="!text-amber-300">66</strong> victories there.
          </p>
          <p>
            Behind the Big Three, <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Andy Murray'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Andy Murray</Link></span> stands fourth with <strong className="!text-amber-300">230</strong> Masters 1000 match wins, while <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Andre Agassi'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Andre Agassi</Link></span> is fifth with <strong className="!text-amber-300">209</strong>. Murray's first Masters 1000 win came at <Link href={getTourneyHref({ slug: 'cincinnati-masters', year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2005 Cincinnati</Link>, and his last at this level came at <Link href={getTourneyHref({ slug: 'miami-masters', year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2024 Miami Open</Link>; Agassi's Masters match-wins story began at <Link href={getTourneyHref({ slug: 'indian-wells-masters', year: 1990 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1990 Indian Wells</Link> and ended at the same tournament in <strong className="!text-orange-300">2006</strong>.
          </p>
          <p>
            The record is now firmly in Djokovic's hands. Nadal is <strong className="!text-amber-300">10</strong> wins behind, Federer <strong className="!text-amber-300">39</strong> behind, while Murray and Agassi are far further back. With Nadal, Federer, Murray and Agassi retired, Djokovic's total has become the fixed target for future generations — unless he adds to it again.
          </p>
        </div>
      );
    }

    if (isGrandSlamOnly) {
      return (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Novak Djokovic'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Novak Djokovic</Link></span>, with <strong className="!text-amber-300">{grandSlamDjokovicWins != null ? grandSlamDjokovicWins.toLocaleString() : 'n/a'}</strong> Grand Slam match wins. He leads <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Roger Federer'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span>, <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Rafael Nadal'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rafael Nadal</Link></span>, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Jimmy Connors'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Jimmy Connors</Link></span> and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Andre Agassi'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Andre Agassi</Link></span>, making him the all-time benchmark for men's singles victories at the majors.
          </p>
          <p>
            Djokovic's first Grand Slam main-draw appearance came at <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2005 Australian Open</Link>, where he lost in the first round to eventual champion <span className="inline-flex items-center gap-2"><Flag ioc="RUS" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Marat Safin'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Marat Safin</Link></span>. His first Grand Slam match win arrived a few months later at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2005 Roland Garros</Link>, when he defeated <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Robby Ginepri'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Robby Ginepri</Link></span> 6-0, 6-0, 6-3. More than twenty years later, Djokovic was still extending a Grand Slam win streak that remains very much open.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Roger Federer'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span> sits second with <strong className="!text-amber-300">369</strong> Grand Slam match wins. His major journey began at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 1999 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1999 Roland Garros</Link>, where he made his Grand Slam debut against <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Patrick Rafter'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Patrick Rafter</Link></span> and lost in four sets. His first major victory came at <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2000 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2000 Australian Open</Link>, when he beat <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Michael Chang'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Michael Chang</Link></span> 6-4, 6-4, 7-6(5). His final Grand Slam match win came at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2021 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2021 Wimbledon</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Lorenzo Sonego'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Lorenzo Sonego</Link></span> 7-5, 6-4, 6-2 to reach the quarter-finals for the 18th time at the All England Club.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Rafael Nadal'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rafael Nadal</Link></span> ranks third with <strong className="!text-amber-300">314</strong> Grand Slam match wins. His first major win came at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2003 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2003 Wimbledon</Link>, when the 17-year-old defeated <span className="inline-flex items-center gap-2"><Flag ioc="CRO" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Mario Ancic'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Mario Ancic</Link></span> 6-3, 6-4, 4-6, 6-4. His last Grand Slam match win came at <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 2022 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">2022 US Open</Link>, where he beat <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Richard Gasquet'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Richard Gasquet</Link></span> 6-0, 6-1, 7-5 in the third round before losing to <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Frances Tiafoe'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Frances Tiafoe</Link></span> in the fourth round.
          </p>
          <p>
            Behind the Big Three, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Jimmy Connors'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Jimmy Connors</Link></span> remains the great bridge to the earlier Open Era, with <strong className="!text-amber-300">233</strong> Grand Slam match wins. Connors' major career was heavily shaped by the <Link href={getTourneyHref({ slug: createSlug('US Open') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>, where he played a record number of matches and won the title on three different surfaces: grass, clay and hard court. His last Grand Slam match win came at <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 1992 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">1992 US Open</Link>, when he beat <span className="inline-flex items-center gap-2"><Flag ioc="BRA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Jaime Oncins'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Jaime Oncins</Link></span> 6-1, 6-2, 6-3 in the first round at age 40.
          </p>
          <p>
            This record is a pure measure of major-match durability. Titles show who finished the job; Grand Slam match wins show who kept winning, round after round, season after season. Djokovic now owns the record, Federer built the modern template, Nadal added unmatched dominance at one major, and Connors remains the great volume winner from the first decades of the Open Era.
          </p>
        </div>
      );
    }

    if (isCarpetCourtOnly) {
      return (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the official ATP surface breakdown stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Jimmy Connors'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Jimmy Connors</Link></span>, with <strong className="!text-amber-300">391</strong> ATP singles match wins on carpet and an <strong className="!text-amber-300">82.7%</strong> win rate on the surface. Connors' total sits inside a career already defined by volume: <strong className="!text-amber-300">1,274</strong> total ATP match wins, the Open Era record across all surfaces. Connors' carpet record was built through the heart of the indoor era. He won <strong className="!text-amber-300">45</strong> carpet-court titles, more than on any other surface in his career, and many of his most important indoor results came on carpet, including the <strong className="!text-amber-300">1977</strong> Grand Prix Masters and the <strong className="!text-amber-300">1977</strong> and <strong className="!text-amber-300">1980</strong> WCT Finals. His late-career carpet wins also show the length of the record. In <strong className="!text-amber-300">1991</strong>, nearly two decades after his early indoor success, Connors was still winning carpet matches at elite events: he beat <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Martin Jaite'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Martin Jaite</Link></span> at <Link href={getTourneyHref({ slug: createSlug('Stockholm') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Stockholm</Link> and <span className="inline-flex items-center gap-2"><Flag ioc="HAI" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Ronald Agenor'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Ronald Agenor</Link></span> at the <Link href={getTourneyHref({ slug: createSlug('Paris Masters') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Paris Masters</Link> on indoor carpet. His final recorded ATP carpet match came at <Link href={getTourneyHref({ slug: createSlug('Philadelphia'), year: 1994 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Philadelphia 1994</Link>, where he lost to <span className="inline-flex items-center gap-2"><Flag ioc="NED" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Paul Haarhuis'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Paul Haarhuis</Link></span> in a third-set tie-break.
          </p>
          <p>
            Behind Connors is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('John McEnroe'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">John McEnroe</Link></span>, whose official ATP carpet record is <strong className="!text-amber-300">349–65</strong>, an even higher win percentage than Connors at <strong className="!text-amber-300">84.3%</strong>. McEnroe is not the volume leader, but he may be the purest carpet player statistically: his game — serve, volley, touch, reflexes and first-strike pressure — was almost perfectly adapted to the speed of indoor carpet.
          </p>
          <p>
            The rest of the leading group belongs almost entirely to the classic indoor era. <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Arthur Ashe'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Arthur Ashe</Link></span> recorded <strong className="!text-amber-300">286</strong> carpet wins, <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Ivan Lendl'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Ivan Lendl</Link></span> had <strong className="!text-amber-300">261</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="GER" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Boris Becker'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Boris Becker</Link></span> finished with <strong className="!text-amber-300">258</strong>. Lendl and Becker carried the carpet tradition into the 1980s and 1990s, when events such as <Link href={getTourneyHref({ slug: createSlug('ATP Finals') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">the year-end championship</Link>, <Link href={getTourneyHref({ slug: createSlug('Paris Masters') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Paris</Link> and <Link href={getTourneyHref({ slug: createSlug('Stockholm') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Stockholm</Link> were central parts of the tour calendar.
          </p>
          <p>
            This record is different from hard, clay or grass wins because it cannot be chased anymore. Modern players cannot add carpet victories because the surface has disappeared from the ATP Tour. That makes Connors' <strong className="!text-amber-300">391</strong> carpet wins a frozen benchmark: a record from a faster, heavier indoor calendar, when a player could build a large part of his season — and his legacy — on a surface that no longer exists.
          </p>
        </div>
      );
    }

    if (isGrassCourtOnly) {
      return (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list stands <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Roger Federer'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span>, with <strong className="!text-amber-300">192</strong> ATP singles match wins on grass, the highest total recorded by any man in the Open Era. Federer's lead is especially significant because modern players have had fewer grass-court events available than players from the early Open Era, when the <Link href={getTourneyHref({ slug: createSlug('Australian Open') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link> was played on grass until <strong className="!text-amber-300">1987</strong> and the <Link href={getTourneyHref({ slug: createSlug('US Open') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link> was also played on grass until <strong className="!text-amber-300">1974</strong>. Federer's grass-court match-wins story began slowly. In <strong className="!text-amber-300">1999</strong>, he played his first ATP grass matches at <Link href={getTourneyHref({ slug: createSlug("Queen's Club") })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Queen's Club</Link> and <Link href={getTourneyHref({ slug: createSlug('Wimbledon') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link>, but finished the season 0–2 on grass. His first ATP grass-court win came the following year at <Link href={getTourneyHref({ slug: createSlug('Halle'), year: 2000 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Halle 2000</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Arnaud Clement'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Arnaud Clement</Link></span> 6-4, 6-2 in the first round. He then beat <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Magnus Larsson'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Magnus Larsson</Link></span> 6-2, 6-3 before losing to <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Michael Chang'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Michael Chang</Link></span> in the quarter-finals. His final grass-court victory came more than two decades later at <Link href={getTourneyHref({ slug: createSlug('Wimbledon') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link> <strong className="!text-amber-300">2021</strong>, when he defeated <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Lorenzo Sonego'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Lorenzo Sonego</Link></span> 7-5, 6-4, 6-2 in the fourth round to reach the quarter-finals for the 18th time at the All England Club. That win closed the competitive arc of Federer's grass-court match-winning career: from <Link href={getTourneyHref({ slug: createSlug('Halle'), year: 2000 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Halle 2000</Link> to <Link href={getTourneyHref({ slug: createSlug('Wimbledon') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link> <strong className="!text-amber-300">2021</strong>, from a teenager learning the surface to the most successful grass-court match winner of the Open Era.
          </p>
          <p>
            Behind Federer sits <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Jimmy Connors'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Jimmy Connors</Link></span>, the great grass-court volume winner of the 1970s and early 1980s, with <strong className="!text-amber-300">185</strong> grass-court match wins. Connors won the <Link href={getTourneyHref({ slug: createSlug('Australian Open') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, <Link href={getTourneyHref({ slug: createSlug('Wimbledon') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link> and <Link href={getTourneyHref({ slug: createSlug('US Open') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link> on grass in <strong className="!text-amber-300">1974</strong>, plus another Wimbledon title in <strong className="!text-amber-300">1982</strong>. His position is tied to a very different calendar: in the early Open Era, grass was not just a short summer swing, but a larger part of the tour and of the Grand Slam schedule.
          </p>
          <p>
            The rest of the top five reflects that older grass-heavy structure. <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('John Newcombe'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">John Newcombe</Link></span> ranks third with <strong className="!text-amber-300">164</strong> grass-court match wins, followed by <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Phil Dent'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Phil Dent</Link></span> with <strong className="!text-amber-300">160</strong> and <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('John Alexander'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">John Alexander</Link></span> with <strong className="!text-amber-300">153</strong>. These totals show how much the record depends on opportunity as well as quality: Federer leads the category, but many of the names behind him built their totals in an era when grass tournaments were more frequent.
          </p>
          <p>
            This is why the grass match-wins record is different from the usual "best grass-court player" debate. Federer owns both the volume record and the most iconic modern grass résumé: <strong className="!text-amber-300">192</strong> match wins, <strong className="!text-amber-300">105</strong> wins at <Link href={getTourneyHref({ slug: createSlug('Wimbledon') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link>, and the longest Open Era winning streak on grass, <strong className="!text-amber-300">65</strong> consecutive wins from <Link href={getTourneyHref({ slug: createSlug('Halle') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Halle</Link> <strong className="!text-amber-300">2003</strong> to <Link href={getTourneyHref({ slug: createSlug('Wimbledon') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link> <strong className="!text-amber-300">2008</strong>. But the record itself is about matches won, not trophies: first rounds, early-week battles, Wimbledon runs, Halle campaigns, and every other tour-level grass victory accumulated across a career.
          </p>
        </div>
      );
    }

    if (isClayCourtOnly) {
      return (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era list stands <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Guillermo Vilas'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Guillermo Vilas</Link></span>, with <strong className="!text-amber-300">681</strong> ATP match wins on clay. No man has won more tour-level singles matches on the surface. Vilas' clay record reflects the tennis calendar of the 1970s, when clay was a much larger part of the tour and specialists could build enormous totals through heavy schedules. His peak came in <strong className="!text-amber-300">1977</strong>, when he produced one of the greatest clay-court seasons ever, winning <Link href={getTourneyHref({ slug: createSlug('Roland Garros') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> and the <Link href={getTourneyHref({ slug: createSlug('US Open') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>, both on clay, and building a historic winning streak on the surface.
          </p>
          <p>
            The closest challenger is <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Manuel Orantes'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Manuel Orantes</Link></span>, with <strong className="!text-amber-300">571</strong> clay-court wins, still <strong className="!text-amber-300">110</strong> behind Vilas. Orantes' record is especially important because it belongs to the same clay-heavy era. His greatest match-win run came at <a href="https://stats.tennismylife.org/tournaments/us-open/1975" className="!text-orange-300 hover:!text-orange-100 font-semibold" target="_blank" rel="noopener noreferrer">1975 US Open</a>, played on Har-Tru clay, where he saved match points against Vilas in the semi-final before beating <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Jimmy Connors'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Jimmy Connors</Link></span> in the final. That tournament is a perfect example of what clay wins often require: tactical variety, patience and recovery from almost impossible positions.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Rafael Nadal'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rafael Nadal</Link></span> ranks third with <strong className="!text-amber-300">484</strong> ATP clay-court wins, but his position tells a different story. Nadal does not own the volume record because the modern calendar offers fewer clay events than the 1970s. What he owns instead is the most dominant clay profile ever: <strong className="!text-amber-300">63</strong> clay-court titles, including <strong className="!text-amber-300">14</strong> <Link href={getTourneyHref({ slug: createSlug('Roland Garros') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> titles. His first ATP win came on the clay of <Link href={getTourneyHref({ slug: createSlug('Mallorca'), year: 2002 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Mallorca 2002</Link>, when, aged 15, he defeated <span className="inline-flex items-center gap-2"><Flag ioc="PAR" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Ramon Delgado'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Ramon Delgado</Link></span> 6-4, 6-4.
          </p>
          <p>
            Fourth on the list is <span className="inline-flex items-center gap-2"><Flag ioc="ROU" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Ilie Nastase'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Ilie Nastase</Link></span>, with <strong className="!text-amber-300">429</strong> clay-court wins. Nastase's clay record belongs to the first great wave of Open Era versatility: he won across surfaces, but more than <strong className="!text-amber-300">400</strong> of his tour-level victories came on clay, including his <Link href={getTourneyHref({ slug: createSlug('Roland Garros') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> title and a strong record in an era when clay was central to the professional calendar.
          </p>
          <p>
            Close behind is <span className="inline-flex items-center gap-2"><Flag ioc="AUT" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Thomas Muster'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Thomas Muster</Link></span>, with <strong className="!text-amber-300">426</strong> clay-court wins. Muster's number captures the clay intensity of the 1990s: heavy topspin, brutal fitness and relentless baseline pressure. His defining season was <strong className="!text-amber-300">1995</strong>, when he won <Link href={getTourneyHref({ slug: createSlug('Roland Garros') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link>, went <strong className="!text-amber-300">65–2</strong> on clay, won <strong className="!text-amber-300">11</strong> tournaments, and produced a <strong className="!text-amber-300">40</strong>-match winning streak on the surface.
          </p>
          <p>
            This record therefore tells a different story from the usual "King of Clay" debate. Nadal is the most dominant clay-court player ever by titles, Roland Garros supremacy and win percentage, but the match-wins record belongs to Vilas. To lead this category, a player needed not only excellence on clay, but also calendar volume, durability and the willingness to play — and win — an enormous number of matches on the surface.
          </p>
        </div>
      );
    }

    if (isHardCourtOnly) {
      return (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era hard-court list stands <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Roger Federer'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span>, with <strong className="!text-amber-300">{hardCourtFederer?.wins ?? 783}</strong> ATP hard-court match wins from <strong className="!text-amber-300">938</strong> matches played on the surface. No man has won more tour-level singles matches on hard courts. Federer’s total includes <strong className="!text-amber-300">191</strong> hard-court Grand Slam wins, split between <strong className="!text-amber-300">102</strong> at the <Link href={getTourneyHref({ slug: createSlug('Australian Open') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link> and <strong className="!text-amber-300">89</strong> at the <Link href={getTourneyHref({ slug: createSlug('US Open') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>.
          </p>
          <p>
            Federer’s hard-court record is especially powerful because it stretches across almost his entire career. His first ATP match win came at <Link href={getTourneyHref({ slug: createSlug('Toulouse'), year: 1998 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Toulouse in 1998</Link>, when he defeated <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Guillaume Raoux'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Guillaume Raoux</Link></span> 6-2, 6-2 as a 17-year-old qualifier. His final hard-court victory came more than two decades later at <Link href={getTourneyHref({ slug: createSlug('Doha'), year: 2021 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Doha in 2021</Link>, where, returning after <span className="text-white">405</span> days away from competition, he beat <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Dan Evans'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Dan Evans</Link></span> 7-6(8), 3-6, 7-5. From the indoor courts of late-1990s Europe to his comeback win in Doha, Federer’s hard-court match-win total is a record of longevity, adaptability and repeated excellence.
          </p>
          <p>
            The closest challenger is <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Novak Djokovic'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Novak Djokovic</Link></span>, who is currently recorded in the database at <strong className="!text-amber-300">{hardCourtContextState?.wins ?? hardCourtDjokovic?.wins ?? 'more than 700'}</strong> hard-court match wins. As an active player, that count can update with every hard-court match; this leaderboard reflects the current DB snapshot rather than a frozen number. Djokovic’s hard-court résumé is different from Federer’s: fewer total wins so far, but an extraordinary winning rate and a record built around the <Link href={getTourneyHref({ slug: createSlug('Australian Open') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>, the <Link href={getTourneyHref({ slug: createSlug('US Open') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link>, the <Link href={getTourneyHref({ slug: createSlug('ATP Finals') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">ATP Finals</Link> and hard-court Masters events.
          </p>
          <p>
            Behind Federer and Djokovic, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Andre Agassi'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Andre Agassi</Link></span> remains the great hard-court specialist of the previous generation, with <strong className="!text-amber-300">592</strong> wins from <strong className="!text-amber-300">750</strong> hard-court matches. His total includes <strong className="!text-amber-300">127</strong> hard-court Grand Slam wins, with <strong className="!text-amber-300">79</strong> at the <Link href={getTourneyHref({ slug: createSlug('US Open') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open</Link> and <strong className="!text-amber-300">48</strong> at the <Link href={getTourneyHref({ slug: createSlug('Australian Open') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link>.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Rafael Nadal'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rafael Nadal</Link></span> ranks fourth with <strong className="!text-amber-300">518</strong> hard-court match wins from <strong className="!text-amber-300">669</strong> matches, despite being historically associated with clay. His hard-court total includes <strong className="!text-amber-300">144</strong> Grand Slam wins on the surface, split between <strong className="!text-amber-300">77</strong> in <Link href={getTourneyHref({ slug: createSlug('Australian Open') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Melbourne</Link> and <strong className="!text-amber-300">67</strong> in <Link href={getTourneyHref({ slug: createSlug('US Open') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">New York</Link>. That number adds depth to the record: Nadal was not just a clay-court phenomenon, but one of the most successful hard-court match winners of the Open Era.
          </p>
          <p>
            The top five is completed by <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Andy Murray'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Andy Murray</Link></span>, who recorded <strong className="!text-amber-300">503</strong> hard-court wins from <strong className="!text-amber-300">680</strong> matches. Murray’s total includes <strong className="!text-amber-300">100</strong> hard-court Grand Slam wins, with <strong className="!text-amber-300">51</strong> in <Link href={getTourneyHref({ slug: createSlug('Australian Open') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Melbourne</Link> and <strong className="!text-amber-300">49</strong> in <Link href={getTourneyHref({ slug: createSlug('US Open') })} className="!text-orange-300 hover:!text-orange-100 font-semibold">New York</Link>. As the fourth member of the Big Four, Murray’s hard-court résumé is a reminder that his career was built on elite defense, relentless clutch play and the ability to keep pace with the era’s very best on every major hard-court stage.
          </p>
        </div>
      );
    }

    const careerWinsRoot = (() => {
      try {
        if (!canonicalUrl) return false;
        const url = new URL(canonicalUrl);
        return url.pathname === '/records/most-career-wins';
      } catch {
        return false;
      }
    })();

    const careerWinsRootNoFilters = careerWinsRoot && (!selectedSurfaces || selectedSurfaces.size === 0) && (!selectedLevels || selectedLevels.size === 0) && !selectedRounds && selectedBestOf == null && selectedTopN == null;

    if (careerWinsRootNoFilters) {
      const careerDjokovic = allWinners.find((p) => p.name === 'Novak Djokovic');
      const careerDjokovicWins = careerContextState?.wins ?? careerDjokovic?.wins ?? 1170;
      const careerDjokovicLosses = careerContextState?.losses ?? 235;
      const connorsDiff = 1274 - careerDjokovicWins;
      const federerDiff = 1251 - careerDjokovicWins;
      return (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            The record most career wins in ATP Tour belongs to <span className="inline-flex items-center gap-2">🇺🇸 <Link href={getPlayerHref(createSlug('Jimmy Connors'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Jimmy Connors</Link></span>, with an official ATP career record of <span className="!text-amber-300 font-semibold">1,274</span> wins. No man in the Open Era has won more tour-level singles matches. His first recorded tour-level win came at <Link href={getTourneyHref({ slug: createSlug('Haverford'), year: 1970 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Haverford in 1970</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Jean-Baptiste Chanfreau'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Jean-Baptiste Chanfreau</Link></span> 6-4, 6-3 in the opening round. His last ATP singles win came 25 years later at <Link href={getTourneyHref({ slug: createSlug('Halle'), year: 1995 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Halle in 1995</Link>, when he beat <span className="inline-flex items-center gap-2"><Flag ioc="GER" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Martin Sinner'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Martin Sinner</Link></span> 7-6(9), 6-0. That distance — from Haverford <span className="!text-amber-300 font-semibold">1970</span> to Halle <span className="!text-amber-300 font-semibold">1995</span> — is what makes the record so difficult to match: it is not just about dominance, but about continuing to win across decades.
        </p>
        <p>
          <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Roger Federer'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span> came closer than anyone else. He finished his career with <span className="!text-amber-300 font-semibold">1,251</span> ATP singles wins, only <span className="!text-amber-300 font-semibold">23</span> short of Connors. Federer’s first ATP match win came at <Link href={getTourneyHref({ slug: createSlug('Toulouse'), year: 1998 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Toulouse in 1998</Link>, where the 17-year-old Swiss qualifier defeated <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Guillaume Raoux'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Guillaume Raoux</Link></span> 6-2, 6-2. His final singles victory came at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2021 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon in 2021</Link>, a straight-sets win over Lorenzo Sonego 7-5, 6-4, 6-2 in the fourth round. Federer’s 1,251 wins form the modern benchmark for sustained excellence: more than two decades of winning from Toulouse to Centre Court.
        </p>
        <p>
          <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Novak Djokovic'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Novak Djokovic</Link></span> is currently recorded at <span className="!text-amber-300 font-semibold">{careerDjokovicWins.toLocaleString()}</span> wins and <span className="!text-amber-300 font-semibold">{careerDjokovicLosses}</span> losses, leaving him <span className="!text-amber-300 font-semibold">{connorsDiff}</span> wins behind Connors and <span className="!text-amber-300 font-semibold">{federerDiff}</span> behind Federer. Djokovic’s first ATP Tour win came at <Link href={getTourneyHref({ slug: createSlug('Bucharest'), year: 2004 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Bucharest in 2004</Link>, when he defeated <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Arnaud Clement'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Arnaud Clement</Link></span> 2-6, 6-4, 6-4 on clay. Unlike Connors and Federer, Djokovic’s match-wins story is still open: every new victory still changes his position in the historical chase.
        </p>
        <p>
          <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Rafael Nadal'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rafael Nadal</Link></span> closed his career with <span className="!text-amber-300 font-semibold">1,080</span> ATP singles wins, built around one of the highest winning percentages in the Open Era. His first ATP win came at <Link href={getTourneyHref({ slug: createSlug('Mallorca'), year: 2002 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Mallorca 2002</Link>, when, aged just 15, he beat <span className="inline-flex items-center gap-2"><Flag ioc="PAR" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Ramon Delgado'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Ramon Delgado</Link></span> 6-4, 6-4. His final singles win came in a symbolic setting: <Link href={getTourneyHref({ slug: 'paris-olympics', year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Paris 2024 Olympics</Link>, where he defeated <span className="inline-flex items-center gap-2"><Flag ioc="HUN" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Marton Fucsovics'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Marton Fucsovics</Link></span> 6-1, 4-6, 6-4 before facing Djokovic in the next round.
        </p>
      </div>
    );
  }

    return null;
  };

  return (
    <section className="mb-0">
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
          {renderIntro()}
          <div className="flex justify-between mb-4">
            <div className="flex items-center justify-center gap-2">
              <label htmlFor="topn" className="text-gray-300">Wins against Top X:</label>
              <select
                id="topn"
                className="bg-gray-800 text-white rounded px-2 py-1"
                value={selectedTopN ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  const n = v === '' ? null : Number(v);
                  setSelectedTopN(n);
                  const newParams = new URLSearchParams(searchParams?.toString() ?? '');
                  if (n === null) newParams.delete('top');
                  else newParams.set('top', String(n));
                  router.replace(`${window.location.pathname}?${newParams.toString()}`);
                }}
              >
                <option value="">All opponents</option>
                <option value="10">Top 10</option>
                <option value="5">Top 5</option>
                <option value="3">Top 3</option>
                <option value="2">Top 2</option>
                <option value="1">Top 1</option>
              </select>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
            >
              View All
            </button>
          </div>

          {renderTable(winners, start)}

          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}

          <Modal
            show={showModal}
            onClose={() => setShowModal(false)}
            title="Players with Most Career Wins"
          >
            {renderTable(allWinners)}
          </Modal>
        </>
      ) : (
        <div className="text-center py-8 text-gray-300">No data available.</div>
      )}
    </section>
  );
}
