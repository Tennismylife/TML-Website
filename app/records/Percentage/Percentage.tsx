'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Flag from '@/components/Flag';
import { playerSurfaceOrMatchesUrl } from "../nav";
import { useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';

interface PercentageProps {
  selectedSurfaces?: Set<string>;
  selectedLevels?: Set<string>;
  selectedRounds?: string;
  selectedBestOf?: number | null;
  topWinPercentages?: PlayerPercentage[];
  fetchEnabled?: boolean;
  description?: string;
}

interface PlayerPercentage {
  id: string | number;
  name: string;
  ioc: string;
  winPercentage: number;
  matchesPlayed: number;
}

const Percentage = ({ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, topWinPercentages, fetchEnabled, description }: PercentageProps) => {
  const [data, setData] = useState<PlayerPercentage[]>(topWinPercentages || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [minMatches, setMinMatches] = useState(15);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const perPage = 20;
  const searchParams = useSearchParams();

  // Reset page when filters change
  useEffect(() => setPage(1), [searchParams]);

  // Always fetch from client when filters change (same pattern as OldestMainDraw)
  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (selectedSurfaces !== undefined) Array.from(selectedSurfaces).forEach((s) => query.append('surface', s));
        if (selectedLevels !== undefined) Array.from(selectedLevels).forEach((l) => query.append('level', l));
        if (selectedRounds) query.append('round', selectedRounds);
        if (selectedBestOf != null) query.append('best_of', selectedBestOf.toString());
        query.set('perPage', showModal ? '1000' : '100');
        query.delete('page');

        const url = `/api/records/percentage${query.toString() ? '?' + query.toString() : ''}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to fetch percentage data');
        const result = await res.json();
        if (!controller.signal.aborted) {
          setData(result.topWinPercentages || []);
          setError(null);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error(err);
          if (!controller.signal.aborted) { setData([]); setError(err); }
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, showModal]);

  const selectedSurfacesArray = selectedSurfaces ? Array.from(selectedSurfaces) : [];
  const selectedLevelsArray = selectedLevels ? Array.from(selectedLevels) : [];
  const isBestWinningPercentage =
    description === 'Best Winning Percentage' &&
    selectedSurfacesArray.length === 0 &&
    selectedLevelsArray.length === 0 &&
    !selectedRounds &&
    selectedBestOf == null;
  const isHardCourtWinningPercentage =
    description === 'Best Win Percentage on Hard Court' &&
    selectedSurfacesArray.length === 1 &&
    selectedSurfacesArray.includes('Hard') &&
    selectedLevelsArray.length === 0 &&
    !selectedRounds &&
    selectedBestOf == null;
  const isClayCourtWinningPercentage =
    description === 'Best Win Percentage on Clay Court' &&
    selectedSurfacesArray.length === 1 &&
    selectedSurfacesArray.includes('Clay') &&
    selectedLevelsArray.length === 0 &&
    !selectedRounds &&
    selectedBestOf == null;
  const isGrassCourtWinningPercentage =
    description === 'Best Win Percentage on Grass Court' &&
    selectedSurfacesArray.length === 1 &&
    selectedSurfacesArray.includes('Grass') &&
    selectedLevelsArray.length === 0 &&
    !selectedRounds &&
    selectedBestOf == null;
  const isCarpetCourtWinningPercentage =
    description === 'Best Win Percentage on Carpet Court' &&
    selectedSurfacesArray.length === 1 &&
    selectedSurfacesArray.includes('Carpet') &&
    selectedLevelsArray.length === 0 &&
    !selectedRounds &&
    selectedBestOf == null;
  const isGrandSlamsWinningPercentage =
    description === 'Best Win Percentage at Grand Slams' &&
    selectedSurfacesArray.length === 0 &&
    selectedLevelsArray.length === 1 &&
    selectedLevelsArray.includes('G') &&
    !selectedRounds &&
    selectedBestOf == null;
  const isMasters1000WinningPercentage =
    description === 'Best Win Percentage at Masters 1000' &&
    selectedSurfacesArray.length === 0 &&
    selectedLevelsArray.length === 1 &&
    selectedLevelsArray.includes('M') &&
    !selectedRounds &&
    selectedBestOf == null;

  const filteredData = data.filter(p => p.matchesPlayed >= minMatches);

  const totalPages = Math.ceil(filteredData.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = filteredData.slice(start, start + perPage);
  const findPlayer = (name: string) => filteredData.find((p) => p.name === name) ?? data.find((p) => p.name === name);
  const formatPct = (value?: number) => (typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)}%` : 'n/a');
  const formatWl = (player?: PlayerPercentage) => {
    if (!player) return 'n/a';
    const wins = Math.round((player.winPercentage / 100) * player.matchesPlayed);
    const losses = player.matchesPlayed - wins;
    return `${wins}-${losses}`;
  };
  const djokovic = findPlayer('Novak Djokovic');
  const nadal = findPlayer('Rafael Nadal');
  const federer = findPlayer('Roger Federer');
  const borg = findPlayer('Bjorn Borg');
  const alcaraz = findPlayer('Carlos Alcaraz');
  const laver = findPlayer('Rod Laver');
  const sampras = findPlayer('Pete Sampras');
  const agassi = findPlayer('Andre Agassi');
  const mcenroe = findPlayer('John McEnroe');
  const lendl = findPlayer('Ivan Lendl');
  const connors = findPlayer('Jimmy Connors');
  const vilas = findPlayer('Guillermo Vilas');
  const becker = findPlayer('Boris Becker');
  const edberg = findPlayer('Stefan Edberg');
  const sinner = findPlayer('Jannik Sinner');
  const hasRows = filteredData.length > 0;

  const renderTable = (rows: PlayerPercentage[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">#</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Wins</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Losses</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Percentage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, idx) => {
            const globalIdx = startIndex + idx + 1;
            const wins = Math.round((p.winPercentage / 100) * p.matchesPlayed);
            const losses = p.matchesPlayed - wins;
            return (
              <tr key={`${p.id}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalIdx}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200 flex items-center justify-center gap-2">
                  <Flag ioc={p.ioc} className="w-4 h-3" />
                  <Link href={playerSurfaceOrMatchesUrl((p as any).slug ?? String(p.id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="text-gray-200 hover:underline">{p.name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{wins}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{losses}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.winPercentage.toFixed(2)}%</td>
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

      {isHardCourtWinningPercentage && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 text-gray-200">
          <p>
            At the top of the Open Era list for <strong>Best Win Percentage on Hard Court</strong> stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, whose hard-court win rate is the best recorded among players with a substantial sample. He sits at <strong className="!text-amber-300">{formatPct(djokovic?.winPercentage)}</strong> with <strong className="!text-amber-300">{formatWl(djokovic)}</strong>. Djokovic’s hard-court dominance is especially significant because it combines percentage, volume and title output: hard court has long been one of his best surfaces, just behind grass, and his résumé on the surface includes 14 hard-court Grand Slam titles, 7 ATP Finals and 29 Masters 1000 hard-court titles.
          </p>
          <p>
            Just behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, who finished his career with an <strong className="!text-amber-300">{formatPct(federer?.winPercentage)}</strong> hard-court win rate, built on a <strong className="!text-amber-300">{formatWl(federer)}</strong> record across {federer?.matchesPlayed ?? 'n/a'} matches. Federer’s hard-court résumé includes 71 hard-court titles, 11 hard-court majors, 6 ATP Finals and 22 Masters 1000 titles on the surface, making him the great pre-Djokovic benchmark for hard-court consistency.
          </p>
          <p>
            Behind the Big Two come the classic hard-court references: <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span> at <strong className="!text-amber-300">{formatPct(connors?.winPercentage)}</strong> with <strong className="!text-amber-300">{formatWl(connors)}</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Rod Laver</span></span> at <strong className="!text-amber-300">{formatPct(laver?.winPercentage)}</strong> with <strong className="!text-amber-300">{formatWl(laver)}</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Ivan Lendl</span></span> at <strong className="!text-amber-300">{formatPct(lendl?.winPercentage)}</strong> with <strong className="!text-amber-300">{formatWl(lendl)}</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John McEnroe</span></span> at <strong className="!text-amber-300">{formatPct(mcenroe?.winPercentage)}</strong> with <strong className="!text-amber-300">{formatWl(mcenroe)}</strong>. They are followed by <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span> at <strong className="!text-amber-300">80.64%</strong> and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span> at <strong className="!text-amber-300">78.93%</strong>, both major hard-court champions whose records underline how difficult it is to stay above 80% on the tour’s most common surface.
          </p>
          <p>
            In this record, the milestone is not simply winning many matches, but sustaining an elite win rate on the surface that defines the modern ATP calendar: Djokovic sets the hard-court percentage ceiling, Federer remains the closest long-career challenger, and Connors, Lendl, McEnroe, Sampras and Agassi form the historical hard-court elite behind them.
          </p>
        </div>
      )}

      {isClayCourtWinningPercentage && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 text-gray-200">
          <p>
            At the top of the Open Era list for <strong>Best Win Percentage on Clay Court</strong> stands <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, whose clay-court record remains the clearest measure of surface dominance in men’s tennis. He sits at <strong className="!text-amber-300">{formatPct(nadal?.winPercentage)}</strong> with <strong className="!text-amber-300">{formatWl(nadal)}</strong>, a level of efficiency built across {nadal?.matchesPlayed ?? 'n/a'} clay-court matches. Nadal’s clay dominance is unique because it combines percentage and volume: the record was not built on a handful of hot streaks, but on years of repeated success across Roland Garros, Monte-Carlo, Rome, Madrid, Hamburg and Barcelona.
          </p>
          <p>
            Just behind him, the first true benchmark is <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Bjorn Borg</span></span>, with <strong className="!text-amber-300">{formatWl(borg)}</strong> and <strong className="!text-amber-300">{formatPct(borg?.winPercentage)}</strong>. Borg remains the classic Open Era clay-court reference before Nadal, and the closest historical reminder that extraordinary clay numbers can survive across different eras.
          </p>
          <p>
            The next Open Era tier is led by <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Carlos Alcaraz</span></span> at <strong className="!text-amber-300">{formatWl(alcaraz)}</strong> and <strong className="!text-amber-300">{formatPct(alcaraz?.winPercentage)}</strong>, followed by <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Ivan Lendl</span></span> at <strong className="!text-amber-300">{formatWl(lendl)}</strong> and <strong className="!text-amber-300">{formatPct(lendl?.winPercentage)}</strong>, then <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, whose clay-court record is the live benchmark in the database, at <strong className="!text-amber-300">{formatWl(djokovic)}</strong> and <strong className="!text-amber-300">{formatPct(djokovic?.winPercentage)}</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="ARG" className="w-4 h-3" /><span>Guillermo Vilas</span></span> at <strong className="!text-amber-300">{formatWl(vilas)}</strong> and <strong className="!text-amber-300">{formatPct(vilas?.winPercentage)}</strong>.
          </p>
          <p>
            In this record, the milestone is not simply being a clay specialist, but sustaining dominance across hundreds of matches: Nadal sets the clay-court ceiling, Borg remains the historical comparison point, and Alcaraz, Lendl, Djokovic and Vilas define the next tier of all-time clay-court efficiency.
          </p>
        </div>
      )}

      {isGrassCourtWinningPercentage && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 text-gray-200">
          <p>
            At the top of the Open Era list for <strong>Best Win Percentage on Grass Court</strong>, the answer depends on the sample threshold: with a smaller but still meaningful modern sample, <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Carlos Alcaraz</span></span> leads the category with <strong className="!text-amber-300">{formatWl(alcaraz)}</strong> and <strong className="!text-amber-300">{formatPct(alcaraz?.winPercentage)}</strong>, while among long-career grass-court greats the benchmark remains <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span> at <strong className="!text-amber-300">{formatWl(federer)}</strong> and <strong className="!text-amber-300">{formatPct(federer?.winPercentage)}</strong>.             Alcaraz’s grass record is still a developing sample, but it is already extraordinary: he has quickly moved to the top of the table and already owns a grass-court win rate that sits above the established all-time names.
          </p>
          <p>
            Behind Federer come <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John McEnroe</span></span> at <strong className="!text-amber-300">{formatWl(mcenroe)}</strong> and <strong className="!text-amber-300">{formatPct(mcenroe?.winPercentage)}</strong>, then <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span> at <strong className="!text-amber-300">{formatWl(djokovic)}</strong> and <strong className="!text-amber-300">{formatPct(djokovic?.winPercentage)}</strong>.
          </p>
          <p>
            Other historical grass-court greats near the top include <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span> at <strong className="!text-amber-300">{formatWl(sampras)}</strong> and <strong className="!text-amber-300">{formatPct(sampras?.winPercentage)}</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span> at <strong className="!text-amber-300">{formatWl(connors)}</strong> and <strong className="!text-amber-300">{formatPct(connors?.winPercentage)}</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="GER" className="w-4 h-3" /><span>Boris Becker</span></span> at <strong className="!text-amber-300">{formatWl(becker)}</strong> and <strong className="!text-amber-300">{formatPct(becker?.winPercentage)}</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Bjorn Borg</span></span> at <strong className="!text-amber-300">{formatWl(borg)}</strong> and <strong className="!text-amber-300">{formatPct(borg?.winPercentage)}</strong>.
          </p>
          <p>
            In this record, the key distinction is sample size: Alcaraz currently owns the highest percentage on grass with a smaller active-career sample, while Federer remains the all-time large-sample grass-court benchmark, combining elite efficiency with unmatched grass-court volume.
          </p>
        </div>
      )}

      {isGrandSlamsWinningPercentage && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 text-gray-200">
          <p>
            At the top of the Open Era list for <strong>Best Win Percentage at Grand Slams</strong> stands <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Bjorn Borg</span></span>, who compiled <strong className="!text-amber-300">{formatWl(borg)}</strong> at the majors for a winning percentage of <strong className="!text-amber-300">{formatPct(borg?.winPercentage)}</strong>. Borg’s number is the classic Grand Slam benchmark because it was built on extraordinary efficiency, with a peak that came alive especially at Roland Garros and Wimbledon.
          </p>
          <p>
            Behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, the large-sample standard, with <strong className="!text-amber-300">{formatWl(djokovic)}</strong> and <strong className="!text-amber-300">{formatPct(djokovic?.winPercentage)}</strong>. Djokovic’s case is different from Borg’s: he has carried that level across a far bigger body of major matches, while still protecting an elite winning rate across all four Slam tournaments.
          </p>
          <p>
            Very close behind is <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, at <strong className="!text-amber-300">{formatWl(nadal)}</strong> and <strong className="!text-amber-300">{formatPct(nadal?.winPercentage)}</strong>, driven above all by his unmatched Roland Garros record. Then comes <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, with <strong className="!text-amber-300">{formatWl(federer)}</strong> and <strong className="!text-amber-300">{formatPct(federer?.winPercentage)}</strong>, the model of long-run Grand Slam consistency.
          </p>
          <p>
            Just behind that quartet, <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Rod Laver</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span>, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span> and <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Ivan Lendl</span></span> keep the all-time majors conversation dense with different kinds of greatness: pure shotmaking, big-match violence, relentless volume and long career excellence.
          </p>
        </div>
      )}

      {isMasters1000WinningPercentage && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 text-gray-200">
          <p>
            At the top of the list for <strong>Best Win Percentage at Masters 1000</strong> stands <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, who owns the highest career match-winning rate at ATP Masters 1000 level among players with a substantial sample. He sits at <strong className="!text-amber-300">{formatPct(nadal?.winPercentage)}</strong> with <strong className="!text-amber-300">{formatWl(nadal)}</strong>.             Nadal’s edge is built on extraordinary consistency across the biggest non-Slam events, especially on clay. He finished with 36 Masters 1000 titles, while Djokovic sits on 40 and Federer on 28.
         
          </p> 
          <p>
            Behind Nadal comes <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, the greatest volume performer in Masters 1000 history, with <strong className="!text-amber-300">{formatWl(djokovic)}</strong> and <strong className="!text-amber-300">{formatPct(djokovic?.winPercentage)}</strong>.
          </p>
          <p>
            Third is <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, who compiled <strong className="!text-amber-300">{formatWl(federer)}</strong> and <strong className="!text-amber-300">{formatPct(federer?.winPercentage)}</strong>. Behind the Big Three come <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Carlos Alcaraz</span></span> at <strong className="!text-amber-300">{formatWl(alcaraz)}</strong> and <strong className="!text-amber-300">{formatPct(alcaraz?.winPercentage)}</strong>, then <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span> at <strong className="!text-amber-300">{formatWl(agassi)}</strong> and <strong className="!text-amber-300">{formatPct(agassi?.winPercentage)}</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span> at <strong className="!text-amber-300">{formatWl(sampras)}</strong> and <strong className="!text-amber-300">{formatPct(sampras?.winPercentage)}</strong>.
          </p>
          <p>
            In this record, the key distinction is percentage versus volume: Nadal holds the pure win-rate ceiling, Djokovic is the all-time Masters 1000 volume leader, Federer is the long-career consistency benchmark behind them, and Agassi plus Sampras define the pre-Big-Three elite standard.
          </p>
        </div>
      )}

      {isCarpetCourtWinningPercentage && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 text-gray-200">
          <p>
            At the top of the Open Era list for <strong>Best Win Percentage on Carpet Court</strong> stands <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John McEnroe</span></span>, whose carpet-court record is the best recorded career winning percentage on the surface among major Open Era samples. He sits at <strong className="!text-amber-300">{formatWl(mcenroe)}</strong> and <strong className="!text-amber-300">{formatPct(mcenroe?.winPercentage)}</strong>.             McEnroe’s carpet dominance fits perfectly with his game: left-handed serve, sharp first volley, elite reflexes and constant net pressure. Carpet was generally a fast indoor surface, and McEnroe turned it into one of his greatest arenas.
          </p>
          <p>
            Other historical carpet greats include <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Ivan Lendl</span></span> at <strong className="!text-amber-300">{formatWl(lendl)}</strong> and <strong className="!text-amber-300">{formatPct(lendl?.winPercentage)}</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span> at <strong className="!text-amber-300">{formatWl(connors)}</strong> and <strong className="!text-amber-300">{formatPct(connors?.winPercentage)}</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Bjorn Borg</span></span> at <strong className="!text-amber-300">{formatWl(borg)}</strong> and <strong className="!text-amber-300">{formatPct(borg?.winPercentage)}</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="GER" className="w-4 h-3" /><span>Boris Becker</span></span> at <strong className="!text-amber-300">{formatWl(becker)}</strong> and <strong className="!text-amber-300">{formatPct(becker?.winPercentage)}</strong>.
          </p>
          <p>
            A useful context note: this record is effectively frozen, because carpet disappeared from the ATP Tour after the 2000s; no modern player can add to it.
          </p>
          <p>
            In this record, the milestone is not simply being good indoors, but sustaining elite efficiency on one of the fastest surfaces tennis has used: McEnroe sets the carpet-court ceiling, while Lendl, Connors and Becker complete the classic elite tier from the surface’s peak era.
          </p>
        </div>
      )}

      {isBestWinningPercentage && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 text-gray-200">
          <p>
            At the top of the Open Era list for <strong>Best Winning Percentage</strong> stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, who owns the highest career men’s singles win rate among players with a substantial tour-level sample, at <strong className="!text-amber-300">{formatPct(djokovic?.winPercentage)}</strong> based on a record of <strong className="!text-amber-300">{formatWl(djokovic)}</strong> in the Open Era. He sits ahead of the other Open Era benchmarks: <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> at <strong className="!text-amber-300">{formatWl(nadal)}</strong> and <strong className="!text-amber-300">{formatPct(nadal?.winPercentage)}</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span> at <strong className="!text-amber-300">{formatWl(federer)}</strong> and <strong className="!text-amber-300">{formatPct(federer?.winPercentage)}</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Bjorn Borg</span></span> at <strong className="!text-amber-300">{formatWl(borg)}</strong> and <strong className="!text-amber-300">{formatPct(borg?.winPercentage)}</strong>.
          </p>
          <p>
            Djokovic’s record is especially powerful because it combines peak dominance with extreme longevity: unlike Borg, whose percentage is built on a shorter career sample, Djokovic has maintained the highest win rate while also playing well over 1,400 tour-level matches. Nadal remains the closest challenger, driven by his extraordinary clay-court dominance and his 22 Grand Slam titles, while Federer’s figure reflects one of the most consistent long careers in tennis history, with more than 1,500 recorded tour-level matches.
          </p>
          <p>
            Behind the Big Three and Borg come other all-time greats such as <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John McEnroe</span></span> at <strong className="!text-amber-300">{formatWl(mcenroe)}</strong> and <strong className="!text-amber-300">{formatPct(mcenroe?.winPercentage)}</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" /><span>Ivan Lendl</span></span> at <strong className="!text-amber-300">{formatWl(lendl)}</strong> and <strong className="!text-amber-300">{formatPct(lendl?.winPercentage)}</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span> at <strong className="!text-amber-300">{formatWl(connors)}</strong> and <strong className="!text-amber-300">{formatPct(connors?.winPercentage)}</strong>. Connors is the opposite type of benchmark: his percentage is lower than Djokovic, Nadal and Federer, but he still owns one of the most remarkable volume records in the sport, with more than 1,270 career wins.
          </p>
          <p>
            In this record, the milestone is not simply winning many matches, but winning them at an elite rate over an entire career: Djokovic set the modern ceiling for career winning percentage, Nadal represents the clay-driven version of dominance, Federer the consistency-and-longevity model, and Borg the pure peak-percentage outlier from the earlier Open Era.
          </p>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-200">
          Minimum Matches: {minMatches}
        </label>
        <input
          type="range"
          min={1}
          max={200}
          value={minMatches}
          onChange={(e) => setMinMatches(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {error ? (
        <div className="text-center py-8 text-gray-300">Error loading data</div>
      ) : loading && !hasRows ? (
        <div className="text-center py-8 text-gray-300">Loading...</div>
      ) : hasRows ? (
        renderTable(currentData, start)
      ) : (
        <div className="text-center py-8 text-gray-300">No data available.</div>
      )}

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}

      <Modal show={showModal} onClose={() => setShowModal(false)} title="Top Win Percentages">
        {renderTable(filteredData)}
      </Modal>
    </section>
  );
};

export default Percentage;
