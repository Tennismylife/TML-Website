"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Flag from '@/components/Flag';
import { playerMatchesUrl, playerSurfaceHref, surfaceFromSelection } from '../nav';
import { usePathname, useSearchParams } from "next/navigation";
import Pagination from "../../../components/Pagination";
import Modal from "@/components/Modal";
import { createSlug, getPlayerHref, getTourneyHref } from '@/lib/utils';

interface Player {
  id: string;
  slug?: string | null;
  name: string;
  ioc?: string;
  totalPlayed: number;
}

export default function Played({ topPlayed, fetchEnabled, description, selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf }: { topPlayed?: any[]; fetchEnabled?: boolean; description?: string; selectedSurfaces?: Set<string>; selectedLevels?: Set<string>; selectedRounds?: string; selectedBestOf?: number | null }) {
  const [allPlayers, setAllPlayers] = useState<Player[]>(topPlayed || []);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const perPage = 20;
  const surfaceLink = surfaceFromSelection(selectedSurfaces);

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
    const fetchPlayers = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (selectedSurfaces !== undefined) Array.from(selectedSurfaces).forEach(s => params.append('surface', s));
        if (selectedLevels !== undefined) Array.from(selectedLevels).forEach(l => params.append('level', l));
        if (selectedRounds) params.set('round', selectedRounds);
        if (selectedBestOf != null) params.set('bestOf', String(selectedBestOf));
        params.set('perPage', showModal ? '1000' : '100');
        params.delete('page');

        const res = await fetch(`/api/records/played?${params.toString()}`, { signal: controller.signal });
        const data = await res.json();
        if (!controller.signal.aborted) setAllPlayers(data.players || []);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error(err);
          if (!controller.signal.aborted) setError('Failed to load records.');
        }
        if (!controller.signal.aborted) setAllPlayers([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchPlayers();
    return () => controller.abort();
  }, [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, showModal]);

  const hasRows = allPlayers.length > 0;
  const totalCount = allPlayers.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const players = allPlayers.slice(start, end);
  const djokovicMatches = allPlayers.find((p) => p.slug === 'novak-djokovic' || p.name === 'Novak Djokovic')?.totalPlayed ?? 0;
  const djokovicRecord = (allPlayers.find((p) => p.slug === 'novak-djokovic' || p.name === 'Novak Djokovic') as any)?.record?.grandSlam ?? '402–56';
  const philDentMatches = allPlayers.find((p) => p.name === 'Phil Dent' || p.slug === 'phil-dent')?.totalPlayed ?? 229;
  const johnAlexanderMatches = allPlayers.find((p) => p.name === 'John Alexander' || p.slug === 'john-alexander')?.totalPlayed ?? 227;
  const connorsMatches = allPlayers.find((p) => p.name === 'Jimmy Connors' || p.slug === 'jimmy-connors')?.totalPlayed ?? 223;
  const federerMatches = allPlayers.find((p) => p.name === 'Roger Federer' || p.slug === 'roger-federer')?.totalPlayed ?? 221;
  const newcombeMatches = allPlayers.find((p) => p.name === 'John Newcombe' || p.slug === 'john-newcombe')?.totalPlayed ?? 209;
  const arthurAsheMatches = allPlayers.find((p) => p.name === 'Arthur Ashe' || p.slug === 'arthur-ashe')?.totalPlayed ?? 372;
  const ilieNastaseMatches = allPlayers.find((p) => p.name === 'Ilie Năstase' || p.slug === 'ilie-nastase' || p.slug === 'ilie-nastase')?.totalPlayed ?? 326;
  const santoroMatches = allPlayers.find((p) => p.name === 'Fabrice Santoro' || p.slug === 'fabrice-santoro')?.totalPlayed ?? 431;
  const gasquetMatches = allPlayers.find((p) => p.name === 'Richard Gasquet' || p.slug === 'richard-gasquet')?.totalPlayed ?? 394;
  const clavetMatches = allPlayers.find((p) => p.name === 'Francisco Clavet' || p.slug === 'francisco-clavet')?.totalPlayed ?? 398;
  const rossetMatches = allPlayers.find((p) => p.name === 'Marc Rosset' || p.slug === 'marc-rosset')?.totalPlayed ?? 378;
  const verdascoMatches = allPlayers.find((p) => p.name === 'Fernando Verdasco' || p.slug === 'fernando-verdasco')?.totalPlayed ?? 375;
  const ferrer500Matches = allPlayers.find((p) => p.name === 'David Ferrer' || p.slug === 'david-ferrer')?.totalPlayed ?? 216;
  const federer500Matches = allPlayers.find((p) => p.name === 'Roger Federer' || p.slug === 'roger-federer')?.totalPlayed ?? 204;
  const nadal500Matches = allPlayers.find((p) => p.name === 'Rafael Nadal' || p.slug === 'rafael-nadal')?.totalPlayed ?? 197;
  const lopez500Matches = allPlayers.find((p) => p.name === 'Feliciano Lopez' || p.slug === 'feliciano-lopez')?.totalPlayed ?? 197;

  // player objects for named narrative (keep counts dynamic)
  const ferrer500 = allPlayers.find((p) => p.name === 'David Ferrer' || p.slug === 'david-ferrer');
  const federer500 = allPlayers.find((p) => p.name === 'Roger Federer' || p.slug === 'roger-federer');
  const nadal500 = allPlayers.find((p) => p.name === 'Rafael Nadal' || p.slug === 'rafael-nadal');
  const lopez500 = allPlayers.find((p) => p.name === 'Feliciano Lopez' || p.slug === 'feliciano-lopez');

  // Dynamic top lists for level-aware narratives (e.g. ATP 500)
  const top500 = [...allPlayers].sort((a, b) => (b.totalPlayed ?? 0) - (a.totalPlayed ?? 0)).slice(0, 4);
  const top500_0 = top500[0];
  const top500_1 = top500[1];
  const top500_2 = top500[2];
  const top500_3 = top500[3];

  const PlayerInline = ({ p }: { p: Player }) => (
    <span className="inline-flex items-center gap-2">
      <Flag ioc={p.ioc} className="w-4 h-3" />
      <Link href={playerSurfaceHref((p as any).slug ?? String(p.id), surfaceLink)} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">
        {p.name}
      </Link>
    </span>
  );

  // richer stats for narrative
  const top500All = [...allPlayers].sort((a, b) => (b.totalPlayed ?? 0) - (a.totalPlayed ?? 0)).slice(0, 8);
  const top4 = top500All.slice(0, 4);
  const sumTop4 = top4.reduce((s, p) => s + (p.totalPlayed ?? 0), 0) || 0;
  const avgTop4 = sumTop4 ? Math.round(sumTop4 / 4) : 0;
  const leaderMatches = top4[0]?.totalPlayed ?? 0;
  const leaderShare = sumTop4 ? Math.round((leaderMatches / sumTop4) * 100) : 0;

  // Generate player link with filters


  // Render table of players
  const renderTable = (playersList: Player[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Matches</th>
          </tr>
        </thead>
        <tbody>
          {playersList.map((p, idx) => {
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
                  <Link href={playerMatchesUrl(p.slug ?? String(p.id), (() => { const params: Record<string, string | string[]> = { result: 'Played' }; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (key === 'bestOf') { const bestOfValues = value.split(',').filter(Boolean); const boMap: Record<string,string> = { '1': 'All+Best+of+1', '3': 'All+Best+of+3', '5': 'All+Best+of+5' }; if (bestOfValues.length === 1) params['set'] = boMap[bestOfValues[0]]; } else { if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } } return params; })())} className="text-indigo-300 hover:underline">
                    {p.totalPlayed}
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

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {pathname === '/records/most-matches-played-on-clay-court' && selectedSurfaces?.size === 1 && selectedSurfaces.has('Clay') && (!selectedLevels || selectedLevels.size === 0) && !selectedRounds && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era clay-court “most played” list stands <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Guillermo Vilas</span></span>, with <strong className="!text-amber-300">854</strong> tour-level singles matches played on clay, calculated from his ATP clay record of <strong className="!text-cyan-300">681–173</strong>. He is the only man in the Open Era to have crossed the 800-match barrier on clay, a total that reflects the very different structure of the 1970s and early 1980s, when the calendar offered far more opportunities to build huge match volume on the surface. His clay-court total eventually closed in the early 1990s, with late appearances including Pembroke Pines 1992, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Grant Stafford</span></span> on clay.
            </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Manuel Orantes</span></span>, with <strong className="!text-amber-300">742</strong> matches played on clay, from a <strong className="!text-cyan-300">571–171</strong> record. Orantes is the only other man above the 700-match milestone on the surface, and his final clay-court appearances came at <Link href={getTourneyHref({ slug: 'kitzbuhel', year: 1984 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Kitzbühel 1984</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Kim Warwick</span></span>.
          </p>
          <p>
            Then comes <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Jose Higueras</span></span>, with <strong className="!text-amber-300">575</strong> clay-court matches played, built from a <strong className="!text-cyan-300">392–183</strong> record. His place in this ranking comes from pure clay volume: a career constructed around repeated appearances on European and American clay, with later clay matches including <Link href={getTourneyHref({ slug: createSlug('Barcelona'), year: 1985 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Barcelona 1985</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="AUT" className="w-4 h-3" /><span>Thomas Muster</span></span>.
            </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="AUT" className="w-4 h-3" /><span>Thomas Muster</span></span> follows with <strong className="!text-amber-300">553</strong> matches played on clay, from a <strong className="!text-cyan-300">426–127</strong> record. His clay-count story is especially distinctive because it stretches from his first rise in the 1980s through his “King of Clay” peak in the 1990s and even into his comeback years; his last ATP-level clay appearance came at <Link href={getTourneyHref({ slug: 'kitzbuhel', year: 2011 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Kitzbühel 2011</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="GER" className="w-4 h-3" /><span>Philipp Kohlschreiber</span></span>.
          </p>
          <p>
            Just behind them are <span className="inline-flex items-center gap-2"><Flag ioc="ROU" className="w-4 h-3" /><span>Ilie Năstase</span></span>, with <strong className="!text-amber-300">543</strong> clay matches played from a <strong className="!text-cyan-300">429–114</strong> record, and <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, with <strong className="!text-amber-300">535</strong> matches played on clay, from an extraordinary <strong className="!text-cyan-300">484–51</strong> record.
          </p>
          <p>
            Nadal’s milestones make his total unique: his first ATP match came on clay at <Link href={getTourneyHref({ slug: createSlug('Mallorca'), year: 2002 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Mallorca 2002</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="PRY" className="w-4 h-3" /><span>Ramon Delgado</span></span>; his <strong className="!text-amber-300">500th</strong> ATP match on clay came at <a href="https://stats.tennismylife.org/tournaments/rome-masters/2021" target="_blank" rel="noopener noreferrer" className="!text-orange-300 hover:!text-orange-100 font-semibold">Rome 2021</a> against <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Reilly Opelka</span></span>; and his final clay-court singles appearance came at <a href="https://stats.tennismylife.org/tournaments/paris-olympics/2024" target="_blank" rel="noopener noreferrer" className="!text-orange-300 hover:!text-orange-100 font-semibold">Paris 2024</a>, on the Roland Garros courts, against <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span> at the Olympic Games.
          </p>
          <p>
            In this record, the number does not measure how dominant a player was on clay, but how often he kept returning to it. Vilas set the historical ceiling at 854 matches, Orantes remains the only other player above 700, and Nadal is the modern exception: fewer total clay matches than the great clay specialists of the 1970s and 1980s, but enough to join the rare group above 500.
          </p>
        </div>
      )}

      {pathname === '/records/most-matches-played-on-hard-court' && selectedSurfaces?.size === 1 && selectedSurfaces.has('Hard') && (!selectedLevels || selectedLevels.size === 0) && !selectedRounds && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era “most played on hard courts” list stands <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Roger Federer'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span>, with <strong className="!text-amber-300">938</strong> tour-level singles matches played on hard courts. His hard-court journey began at <Link href={getTourneyHref({ slug: createSlug('Toulouse'), year: 1998 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Toulouse 1998</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Guillaume Raoux</span></span>, and ended more than 22 years later at <Link href={getTourneyHref({ slug: createSlug('Doha'), year: 2021 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Doha 2021</Link>, against <span className="inline-flex items-center gap-2"><Flag ioc="GEO" className="w-4 h-3" /><span>Nikoloz Basilashvili</span></span>.
                </p>
                
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Novak Djokovic'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Novak Djokovic</Link></span>, the highest active player on the list, currently with <strong className="!text-amber-300">{djokovicMatches}</strong> tour-level singles matches played on hard courts. His first hard-court match came against <span className="inline-flex items-center gap-2"><Flag ioc="NED" className="w-4 h-3" /><span>Dennis Van Scheppingen</span></span> at <Link href={getTourneyHref({ slug: createSlug('Bangkok'), year: 2004 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Bangkok 2004</Link>.
          </p>
          <p>
            Then comes <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Andre Agassi'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Andre Agassi</Link></span>, with <strong className="!text-amber-300">750</strong> matches played on hard courts. His hard-court path began at <Link href={getTourneyHref({ slug: createSlug('La Quinta'), year: 1986 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">La Quinta 1986</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John Austin</span></span>, and ended two decades later at the <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 2006</Link>, against <span className="inline-flex items-center gap-2"><Flag ioc="GER" className="w-4 h-3" /><span>Benjamin Becker</span></span>.
          </p>
          <p>
            Behind Agassi stands <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Andy Murray'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Andy Murray</Link></span>, with <strong className="!text-amber-300">680</strong> tour-level hard-court matches played. Murray’s first ATP hard-court match came at <Link href={getTourneyHref({ slug: createSlug('Indianapolis'), year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Indianapolis 2005</Link>, against <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jesse Witten</span></span>, while his final hard-court singles match came at <Link href={getTourneyHref({ slug: createSlug('Miami'), year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 2024</Link>, against <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Tomas Machac</span></span>.
          </p>
          <p>
            Rounding out this group is <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Rafael Nadal'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rafael Nadal</Link></span>, with <strong className="!text-amber-300">669</strong> matches played on hard courts. Nadal’s first tour-level hard-court match came at the <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 2003 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 2003</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Fernando Vicente</span></span>, and he closed his career playing a Davis Cup match in Malaga in 2024 against <span className="inline-flex items-center gap-2"><Flag ioc="NED" className="w-4 h-3" /><span>Botic van de Zandschulp</span></span>.
          </p>
        </div>
      )}

      {pathname === '/records/most-matches-played-on-carpet-court' && selectedSurfaces?.size === 1 && selectedSurfaces.has('Carpet') && (!selectedLevels || selectedLevels.size === 0) && !selectedRounds && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era carpet-court “most played” list stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>, with <strong className="!text-amber-300">473</strong> tour-level singles matches played on carpet, calculated from his ATP surface record of <strong className="!text-cyan-300">391–82</strong>. He is the only man to have gone beyond the 450-match barrier on carpet, a total that belongs to an era in which indoor carpet was one of the central surfaces of the tour. His final recorded ATP carpet appearance came at <Link href={getTourneyHref({ slug: createSlug('Philadelphia'), year: 1994 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Philadelphia 1994</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="NLD" className="w-4 h-3" /><span>Paul Haarhuis</span></span> in the first round.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John McEnroe</span></span>, with <strong className="!text-amber-300">414</strong> matches played on carpet, from an ATP carpet record of <strong className="!text-cyan-300">349–65</strong>. McEnroe is the only other player above the 400-match milestone on the surface, and his final carpet appearance came at <Link href={getTourneyHref({ slug: createSlug('Rotterdam'), year: 1994 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Rotterdam 1994</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Magnus Gustafsson</span></span>.
          </p>
          <p>
            Also among the leading group is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Arthur Ashe'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Arthur Ashe</Link></span>, with <strong className="!text-amber-300">{arthurAsheMatches}</strong> carpet matches played. Ashe’s carpet-court journey began at <a href="https://stats.tennismylife.org/tournaments/salisbury-wct/1970" className="!text-orange-300 hover:!text-orange-100 font-semibold" target="_blank" rel="noopener noreferrer">Salisbury 1970</a>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="ECU" className="w-4 h-3" /><span>Pancho Guzman</span></span> in the opening round of the U.S. National Indoor Championships.
          </p>
          <p>
            Close behind is <span className="inline-flex items-center gap-2"><Flag ioc="ROU" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Ilie Năstase'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Ilie Năstase</Link></span>, with <strong className="!text-amber-300">{ilieNastaseMatches}</strong> carpet matches played. Năstase’s first recorded carpet match also came at <a href="https://stats.tennismylife.org/tournaments/salisbury-wct/1970" className="!text-orange-300 hover:!text-orange-100 font-semibold" target="_blank" rel="noopener noreferrer">Salisbury 1970</a>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><span>Gerald Battrick</span></span>; from there, his indoor schedule became one of the defining parts of his early Open Era career.
          </p>
          <p>
            Then comes <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Boris Becker</span></span>, with <strong className="!text-amber-300">322</strong> matches played on carpet, built from a <strong className="!text-cyan-300">258–64</strong> surface record. Becker’s total places him among the few men to cross the 300-match mark on carpet; his last ATP carpet match came at Paris <strong className="!text-amber-300">1998</strong>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Nicolas Escudé</span></span> in the first round.
          </p>
          

          <p>
            In this record, carpet is a different kind of historical marker: unlike hard, clay or grass, it is a surface that disappeared from the ATP Tour after <strong className="!text-amber-300">2009</strong>, making these totals effectively frozen in time. Connors and McEnroe dominate because they played through the peak carpet era.
          </p>
        </div>
      )}

      {pathname === '/records/most-grand-slam-matches-played' && (!selectedLevels || selectedLevels.size === 0 || selectedLevels.has('G')) && (!selectedSurfaces || selectedSurfaces.size === 0) && !selectedRounds && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era Grand Slam “most played” list stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, with <strong className="!text-amber-300">{djokovicMatches}</strong> men’s singles matches played at majors. His Grand Slam journey began at <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2005 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 2005</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="RUS" className="w-4 h-3" /><span>Marat Safin</span></span> in the first round; twenty years later, at <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2025 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 2025</Link>, he played his 430th Grand Slam match against <span className="inline-flex items-center gap-2"><Flag ioc="POR" className="w-4 h-3" /><span>Jaime Faria</span></span>, passing Roger Federer for the all-time men’s record. Djokovic’s 400th Grand Slam match played had come at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2023 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2023</Link>, against <span className="inline-flex items-center gap-2"><Flag ioc="RUS" className="w-4 h-3" /><span>Andrey Rublev</span></span> in the quarter-finals, another marker in a career built almost entirely around repeated deep runs at the four biggest tournaments.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><span>Roger Federer</span></span>, who finished with <strong className="!text-amber-300">429</strong> Grand Slam singles matches played, the previous record before Djokovic moved past him. Federer’s first major match came at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 1999 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 1999</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Patrick Rafter</span></span>, while his 400th Grand Slam match came exactly twenty years later at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 2019 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2019</Link>, against <span className="inline-flex items-center gap-2"><Flag ioc="NOR" className="w-4 h-3" /><span>Casper Ruud</span></span>. His final Grand Slam appearance came at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2021 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2021</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="POL" className="w-4 h-3" /><span>Hubert Hurkacz</span></span> in the quarter-finals.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> is third with <strong className="!text-amber-300">358</strong> Grand Slam matches played, from a major record of <strong className="!text-cyan-300">314–44</strong>. His first Grand Slam match came at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2003 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2003</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="HRV" className="w-4 h-3" /><span>Mario Ancic</span></span> in the opening round; his match-count story ended at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2024</Link>, against <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Alexander Zverev</span></span>.
          </p>
          <p>
            Then comes <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>, with <strong className="!text-amber-300">282</strong> Grand Slam singles matches played, built across an unusually long major career from the early 1970s into the 1990s. His US Open path alone stretched from his <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 1970 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 1970</Link> debut against <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Mark Cox</span></span> to his final <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 1992 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 1992</Link> appearance, when he faced <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Ivan Lendl</span></span> in the second round.
          </p>
          <p>
            Just behind him is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span>, with <strong className="!text-amber-300">277</strong> Grand Slam matches played: his major career began at the <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 1986 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 1986</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><span>Jeremy Bates</span></span> and ended at the <Link href={getTourneyHref({ slug: createSlug('US Open'), year: 2006 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">US Open 2006</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Benjamin Becker</span></span>.
          </p>
          <p>
            In this record, the milestone is not a title, a final or a single victory: it is the ability to keep returning to the Grand Slam stage. Djokovic has pushed the ceiling beyond 450 matches, Federer was the first man to reach 400, Nadal carried his total through two decades of major battles, while Connors and Agassi show how rare it is to stay relevant at the majors across an entire tennis lifetime.
          </p>
        </div>
      )}

      {pathname === '/records/most-matches-played-at-masters-1000' && (!selectedLevels || selectedLevels.size === 0 || selectedLevels.has('M')) && (!selectedSurfaces || selectedSurfaces.size === 0) && !selectedRounds && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the ATP Masters 1000 “most played” list stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, with <strong className="!text-amber-300">{djokovicMatches}</strong> matches played at this level. His Masters path began in the mid-2000s, and one of its clearest milestones came at Indian Wells <strong className="!text-amber-300">2025</strong>, where he played his 500th Masters 1000 match against <span className="inline-flex items-center gap-2"><Flag ioc="NLD" className="w-4 h-3" /><span>Botic van de Zandschulp</span></span>.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, who closed his Masters 1000 career exactly at <strong className="!text-amber-300">500</strong> matches played, from a record of <strong className="!text-cyan-300">410–90</strong>. Nadal’s final Masters match came at <a href="https://stats.tennismylife.org/tournaments/rome-masters/2024" className="!text-orange-300 hover:!text-orange-100 font-semibold" target="_blank" rel="noopener noreferrer">Rome 2024</a>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="POL" className="w-4 h-3" /><span>Hubert Hurkacz</span></span> in the second round, fixing his total at the 500-match milestone.
          </p>
          <p>
            Next comes <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, with <strong className="!text-amber-300">489</strong> Masters 1000 matches played. His Masters career began against <span className="inline-flex items-center gap-2"><Flag ioc="DEN" className="w-4 h-3" /><span>Kenneth Carlsen</span></span> at <Link href={getTourneyHref({ slug: createSlug('Miami Masters'), year: 1999 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 1999</Link>, and his final Masters match came at <Link href={getTourneyHref({ slug: 'shanghai-masters', year: 2019 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Shanghai Masters 2019</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="GER" className="w-4 h-3" /><span>Alexander Zverev</span></span>.
          </p>
          <p>
            Then comes <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" /><span>Andy Murray</span></span>, with <strong className="!text-amber-300">331</strong> Masters 1000 matches played, from a <strong className="!text-cyan-300">230–101</strong> record. Murray’s first Masters 1000 win came at <a href="https://stats.tennismylife.org/tournaments/cincinnati-masters/2005" className="!text-orange-300 hover:!text-orange-100 font-semibold" target="_blank" rel="noopener noreferrer">Cincinnati 2005</a> against <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Taylor Dent</span></span>, while his final Masters appearance came at <a href="https://stats.tennismylife.org/tournaments/miami-masters/2024" className="!text-orange-300 hover:!text-orange-100 font-semibold" target="_blank" rel="noopener noreferrer">Miami 2024</a>, against <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Tomas Machac</span></span>.
          </p>
          <p>
            Just behind Murray are <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>David Ferrer</span></span>, with <strong className="!text-amber-300">311</strong> Masters 1000 matches played from a <strong className="!text-cyan-300">189–122</strong> record, and <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Tomas Berdych</span></span>, with <strong className="!text-amber-300">308</strong> from <strong className="!text-cyan-300">191–117</strong>. Ferrer’s Masters count ended at <a href="https://stats.tennismylife.org/tournaments/madrid-masters/2019" className="!text-orange-300 hover:!text-orange-100 font-semibold" target="_blank" rel="noopener noreferrer">Madrid 2019</a> against <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" /><span>Alexander Zverev</span></span>, while Berdych’s final Masters appearance came at <a href="https://stats.tennismylife.org/tournaments/indian-wells-masters/2019" className="!text-orange-300 hover:!text-orange-100 font-semibold" target="_blank" rel="noopener noreferrer">Indian Wells 2019</a> against <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Feliciano Lopez</span></span>.
          </p>
          <p>
            In this record, the milestone is not the title or the final, but the repeated act of showing up at the tour’s highest regular-season level: Djokovic and Nadal are the only men to reach 500 Masters 1000 matches, Federer finished just short of that line, and Murray remains the clear leader of the group behind the Big Three.
          </p>
        </div>
      )}

      {pathname === '/records/most-davis-cup-matches-played' && selectedLevels?.size === 1 && selectedLevels.has('D') && (!selectedSurfaces || selectedSurfaces.size === 0) && !selectedRounds && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Davis Cup “most played” list stands <span className="inline-flex items-center gap-2"><Flag ioc="ROU" className="w-4 h-3" /><span>Ilie Nastase</span></span>, with <strong className="!text-amber-300">90</strong> Davis Cup matches played between <strong className="!text-amber-300">1968</strong> and <strong className="!text-amber-300">1984</strong>. His record remains the benchmark for national-team durability in the Open Era.
          </p>
          <p>
            Second on the list is Pakistan’s <span className="inline-flex items-center gap-2"><Flag ioc="PAK" className="w-4 h-3" /><span>Aqeel Khan</span></span> with <strong className="!text-amber-300">73</strong> matches, while India’s <span className="inline-flex items-center gap-2"><Flag ioc="IND" className="w-4 h-3" /><span>Leander Paes</span></span> is third with <strong className="!text-amber-300">70</strong>. Paes’ Davis Cup career stretched from <strong className="!text-amber-300">1990</strong> to <strong className="!text-amber-300">2008</strong>, making him one of the competition’s longest-serving singles specialists.
          </p>
          <p>
            The next positions are held by Italy’s <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" /><span>Adriano Panatta</span></span> with <strong className="!text-amber-300">63</strong> matches and Thailand’s <span className="inline-flex items-center gap-2"><Flag ioc="THA" className="w-4 h-3" /><span>Danai Udomchoke</span></span> with <strong className="!text-amber-300">61</strong>. Their totals underline how Davis Cup rewards players who are available for ties over many years.
          </p>
          <p>
            This record is about national-team longevity more than individual tour success: it measures the players who returned to Davis Cup year after year, across home-and-away ties, and who became fixtures of their country’s team selection.
          </p>
        </div>
      )}

      {pathname === '/records/most-atp-500-matches-played' && selectedLevels?.size === 1 && selectedLevels.has('500') && (!selectedSurfaces || selectedSurfaces.size === 0) && !selectedRounds && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the ATP 500 “most played” including ATP International Series Gold list stands {federer500 ? (
              <span className="inline-flex items-center gap-2"><Flag ioc={federer500.ioc} className="w-4 h-3" /><Link href={playerSurfaceHref((federer500 as any).slug ?? String(federer500.id), surfaceLink)} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">{federer500.name}</Link></span>
            ) : null} with <strong className="!text-amber-300">{federer500Matches}</strong> matches played at this level. His ATP 500 presence is defined by selective, high-quality appearances and deep runs.
          </p>
          <p>
            Close behind is {ferrer500 ? (
              <span className="inline-flex items-center gap-2"><Flag ioc={ferrer500.ioc} className="w-4 h-3" /><Link href={playerSurfaceHref((ferrer500 as any).slug ?? String(ferrer500.id), surfaceLink)} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">{ferrer500.name}</Link></span>
            ) : (
              <PlayerInline p={top500_1 as Player} />
            )} with <strong className="!text-amber-300">{ferrer500Matches}</strong> matches; Ferrer’s total is mostly the product of persistent entries at the mid-tier events that populate the European clay swing and indoor hard-court weeks. The following positions include {lopez500 ? (
              <span className="inline-flex items-center gap-2"><Flag ioc={lopez500.ioc} className="w-4 h-3" /><Link href={playerSurfaceHref((lopez500 as any).slug ?? String(lopez500.id), surfaceLink)} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">{lopez500.name}</Link></span>
            ) : 'Feliciano Lopez'} with <strong className="!text-amber-300">{lopez500Matches}</strong> and {nadal500 ? (
              <span className="inline-flex items-center gap-2"><Flag ioc={nadal500.ioc} className="w-4 h-3" /><Link href={playerSurfaceHref((nadal500 as any).slug ?? String(nadal500.id), surfaceLink)} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">{nadal500.name}</Link></span>
            ) : 'Rafael Nadal'} with <strong className="!text-amber-300">{nadal500Matches}</strong>.
          </p>
          <p>
            Ferrer’s lead is mostly the product of persistent entries at the mid-tier events that populate the European clay swing and indoor hard-court weeks; Federer’s total reflects selective, high-quality appearances and deep runs. Nadal’s number comes from repeated high-level entries (especially on clay), while Lopez exemplifies longevity and consistent weekly participation across many seasons.
          </p>
          
        </div>
      )}

      {pathname === '/records/most-atp-250-matches-played' && selectedLevels?.size === 1 && selectedLevels.has('250') && (!selectedSurfaces || selectedSurfaces.size === 0) && !selectedRounds && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the ATP 250 “most played” including the earlier ATP International Series list stands <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Fabrice Santoro</span></span>, with <strong className="!text-amber-300">{santoroMatches}</strong> matches played at this level. His total comes from a career that stretched from <strong className="!text-amber-300">1990</strong> to <strong className="!text-amber-300">2009</strong>, defined by a willingness to keep returning to the tour’s workhorse 250 events across every surface.
          </p>
          <p>
            Close behind is Spain’s <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Francisco Clavet</span></span> with <strong className="!text-amber-300">{clavetMatches}</strong> matches played, and fellow Frenchman <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Richard Gasquet</span></span> is third with <strong className="!text-amber-300">{gasquetMatches}</strong>. Clavet’s total is a testament to the longevity of a clay-court specialist who made the ATP 250 schedule his season backbone.
          </p>
          <p>
            The next positions are held by <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Marc Rosset</span></span>, with <strong className="!text-amber-300">{rossetMatches}</strong> matches played, and <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Fernando Verdasco</span></span>, with <strong className="!text-amber-300">{verdascoMatches}</strong>. Both men used the ATP 250 swing to accumulate volume and extend their careers through the tour’s most common tournaments.
          </p>
          <p>
            In this record, the achievement is not a headline title but the repeated act of showing up. The ATP 250 list rewards durability, volume and the players who made the tour’s lower-tier events a regular part of their careers.
          </p>
        </div>
      )}

      {pathname === '/records/most-matches-played-on-grass-court' && selectedSurfaces?.size === 1 && selectedSurfaces.has('Grass') && (!selectedLevels || selectedLevels.size === 0) && !selectedRounds && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era grass-court “most played” list stands <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>John Alexander</span></span>, with <strong className="!text-amber-300">{johnAlexanderMatches}</strong> grass-court matches played, from a <strong className="!text-cyan-300">153–96</strong> record. His final grass appearance came at <a href="https://stats.tennismylife.org/tournaments/sydney/1985" className="!text-orange-300 hover:!text-orange-100 font-semibold" target="_blank" rel="noopener noreferrer">Sydney Outdoor 1985</a>, against <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Mike Bauer</span></span>.
          </p>
          <p>
            Just behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Phil Dent</span></span>, with <strong className="!text-amber-300">{philDentMatches}</strong> tour-level singles matches played on grass, built from a surface record of <strong className="!text-cyan-300">160–87</strong>. His total reflects an era in which grass was still a major part of the calendar, especially through the Australian circuit; the match that closed his grass-court count came at <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 1983 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 1983</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>John Fitzgerald</span></span>.
          </p>
          <p>
            Then comes <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>, with <strong className="!text-amber-300">{connorsMatches}</strong> matches played on grass, calculated from his official ATP surface record of <strong className="!text-cyan-300">185–38</strong>. His grass journey stretched from the early 1970s through his final grass-court match at Halle in <strong className="!text-amber-300">1995</strong>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><span>Marc Rosset</span></span>; that late-career appearance helped make Connors one of only a handful of men to pass the 220-match barrier on grass.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><span>Roger Federer</span></span> follows almost level with him at <strong className="!text-amber-300">{federerMatches}</strong> grass-court matches played, from a <strong className="!text-cyan-300">192–29</strong> record. Federer’s grass story began with early appearances such as <Link href={getTourneyHref({ slug: createSlug('Queens Club'), year: 1999 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Queen’s Club 1999</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="ZIM" className="w-4 h-3" /><span>Byron Black</span></span>, and closed at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2021 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2021</Link>, where his final singles match on the surface came against <span className="inline-flex items-center gap-2"><Flag ioc="POL" className="w-4 h-3" /><span>Hubert Hurkacz</span></span>.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>John Newcombe</span></span> completes the rare group above 200, with <strong className="!text-amber-300">{newcombeMatches}</strong> grass-court matches played, from an ATP grass record of <strong className="!text-cyan-300">164–45</strong>. His total belongs to the older grass-heavy calendar, when the Australian Open, Wimbledon and the US Open could all contribute to a player’s grass volume; one of his late grass-court milestones came at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 1978 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 1978</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="MEX" className="w-4 h-3" /><span>Raul Ramirez</span></span> in the round of 16.
          </p>
          <p>
            In this record, the milestone is not dominance alone, but repeated presence on the sport’s fastest and shortest-season surface: Dent and Alexander lead because they played through a grass-rich era, Connors and Federer turned grass longevity into all-time records, and Newcombe remains the bridge to the earlier structure of the Open Era.
          </p>
        </div>
      )}

      {pathname === '/records/most-matches-played-best-of-3' && selectedBestOf === 3 && (!selectedSurfaces || selectedSurfaces.size === 0) && (!selectedLevels || selectedLevels.size === 0) && !selectedRounds && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the best-of-3 matches played list stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>, with <strong className="!text-amber-300">1,194</strong> tour-level matches played at the three-set distance from <strong className="!text-amber-300">1969</strong> to <strong className="!text-amber-300">1996</strong>. This is the format that defines the regular ATP schedule, and his total is the highest volume ever recorded in the Open Era for best-of-3 encounters.
          </p>
          <p>
            Second is <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><span>Roger Federer</span></span>, with <strong className="!text-amber-300">1,027</strong> best-of-3 matches between <strong className="!text-amber-300">1998</strong> and <strong className="!text-amber-300">2021</strong>. Next come <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Guillermo Vilas</span></span> with <strong className="!text-amber-300">927</strong> matches (from <strong className="!text-amber-300">1969</strong> to <strong className="!text-amber-300">1992</strong>), followed by <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Ivan Lendl</span></span> with <strong className="!text-amber-300">925</strong> matches (<strong className="!text-amber-300">1978–1994</strong>) and <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> with <strong className="!text-amber-300">917</strong> matches (<strong className="!text-amber-300">2002–2024</strong>).
          </p>
          <p>
            This record is not just about winning big titles: it is about the players who kept returning to the tour’s weekly three-set battles, filling their schedules with the most common professional match format and turning durability into the defining metric.
          </p>
        </div>
      )}

      {pathname === '/records/most-matches-played-best-of-5' && selectedBestOf === 5 && (!selectedSurfaces || selectedSurfaces.size === 0) && (!selectedLevels || selectedLevels.size === 0) && !selectedRounds && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the best-of-5 matches played list stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, with <strong className="!text-amber-300">{djokovicMatches}</strong> tour-level matches played over five sets. Djokovic’s total reflects his longevity at majors and other five-set opportunities, making him the modern benchmark for best-of-5 durability.
          </p>
          <p>
            Close behind are <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> with <strong className="!text-amber-300">391</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Ivan Lendl</span></span> with <strong className="!text-amber-300">385</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="ROU" className="w-4 h-3" /><span>Ilie Nastase</span></span> with <strong className="!text-amber-300">364</strong> matches.
          </p>
          <p>
            This record is the story of the longest, most physically demanding battles in men’s tennis, where a player had to last through five sets and still come back for the next Grand Slam. The top names here are the players who defined five-set endurance across the modern Open Era.
          </p>
        </div>
      )}

      {pathname === '/records/most-matches-played' && (!selectedSurfaces || selectedSurfaces.size === 0) && (!selectedLevels || selectedLevels.size === 0) && !selectedRounds && selectedBestOf == null && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 !text-gray-200">
          <p>
            At the top of the Open Era “most played” list stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Jimmy Connors'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Jimmy Connors</Link></span>, with <strong className="!text-amber-300">1,557</strong> tour-level singles matches played, the highest total ever recorded by a man in the Open Era. His match-count journey began at <Link href={getTourneyHref({ slug: createSlug('Haverford'), year: 1970 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Haverford 1970</Link>, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Jean-Baptiste Chanfreau</span></span>, and ended more than 25 years later at <Link href={getTourneyHref({ slug: createSlug('Atlanta'), year: 1996 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Atlanta 1996</Link>, against <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Richey Reneberg</span></span>.
          </p>
          <p>
            Behind him stands <span className="inline-flex items-center gap-2"><Flag ioc="SUI" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Roger Federer'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Roger Federer</Link></span>, who finished with <strong className="!text-amber-300">1,526</strong> matches played: his first ATP Tour match came at <Link href={getTourneyHref({ slug: createSlug('Gstaad'), year: 1998 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Gstaad 1998</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Lucas Arnold Ker</span></span>, his <strong className="!text-amber-300">1,000th</strong> career match came at the <Link href={getTourneyHref({ slug: createSlug('Australian Open'), year: 2012 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open 2012</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Juan Martin del Potro</span></span>, his <strong className="!text-amber-300">1,500th</strong> tour-level match came at <Link href={getTourneyHref({ slug: createSlug('Basel'), year: 2019 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Basel 2019</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="GER" className="w-4 h-3" /><span>Peter Gojowczyk</span></span>, and he closed his career at <Link href={getTourneyHref({ slug: createSlug('Wimbledon'), year: 2021 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon 2021</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="POL" className="w-4 h-3" /><span>Hubert Hurkacz</span></span>.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Novak Djokovic'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Novak Djokovic</Link></span> is the highest active player on the list, currently at <strong className="!text-amber-300">{djokovicMatches}</strong> tour-level singles matches played; his ATP-level path began in <strong className="!text-amber-300">2004</strong>, with early main-tour appearances at Umag and Bucharest, where he faced <span className="inline-flex items-center gap-2"><Flag ioc="ITA" className="w-4 h-3" /><span>Filippo Volandri</span></span> and then <span className="inline-flex items-center gap-2"><Flag ioc="FRA" className="w-4 h-3" /><span>Arnaud Clement</span></span>.
          </p>
          <p>
            Then come <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Ivan Lendl'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Ivan Lendl</Link></span>, with <strong className="!text-amber-300">1,310</strong> matches played, and <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Rafael Nadal'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Rafael Nadal</Link></span>, with <strong className="!text-amber-300">1,308</strong>: Nadal’s first ATP match came at <Link href={getTourneyHref({ slug: createSlug('Mallorca'), year: 2002 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Mallorca 2002</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="PRY" className="w-4 h-3" /><span>Ramon Delgado</span></span>, his <strong className="!text-amber-300">1,000th</strong> career match was at <Link href={getTourneyHref({ slug: createSlug('Miami'), year: 2017 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Miami 2017</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="GER" className="w-4 h-3" /><span>Philipp Kohlschreiber</span></span>, and his <strong className="!text-amber-300">1,300th</strong> official singles match came at <Link href={getTourneyHref({ slug: createSlug('Roland Garros'), year: 2024 })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros 2024</Link> against <span className="inline-flex items-center gap-2"><Flag ioc="GER" className="w-4 h-3" /><Link href={getPlayerHref(createSlug('Alexander Zverev'))} className="!text-cyan-300 hover:!text-cyan-100 font-semibold">Alexander Zverev</Link></span>. He closed his career by playing a Davis Cup match in Malaga in 2024 against <span className="inline-flex items-center gap-2"><Flag ioc="NED" className="w-4 h-3" /><span>Botic van de Zandschulp</span></span>.
          </p>
        </div>
      )}

          {renderTable(players, start)}

          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}

          <Modal
            show={showModal}
            onClose={() => setShowModal(false)}
            title="Players with Most Career Games Played"
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
