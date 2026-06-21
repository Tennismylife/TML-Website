'use client';

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Pagination from "../../../components/Pagination";
import Modal from "@/components/Modal";
import Flag from "@/components/Flag";
import { getTourneyHref, getPlayerHref } from "@/lib/utils";
import { playerSurfaceOrMatchesUrl } from "../nav";

interface WinsSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRounds: string;
  selectedBestOf: number | null;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  description?: string;
}

interface Winner {
  winner_id: string;
  player_name: string;
  ioc?: string;
  total_wins: number;
  tourney_id: string;
  tourney_name: string;
}

export default function WinsSection({ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, fetchEnabled, setFetchEnabled, fetchRequestId, description, initialData }: WinsSectionProps & { fetchRequestId?: string | null; initialData?: Winner[] }) {
  const enabled = !!fetchEnabled;
  const [allWinners, setAllWinners] = useState<Winner[]>(Array.isArray(initialData) ? initialData : []);
  // Show loading immediately when SSR didn't provide any data (prefetch failed or returned empty)
  const [loading, setLoading] = useState(!initialData?.length);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const perPage = 20;
  const searchParams = useSearchParams();
  const lastRequestRef = useRef<string | null>(null);

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  useEffect(() => {
    // Trigger client fetch on mount when SSR provided `initialData` so the
    // client replaces the SSR top‑10 with the full `limit=100` result set.
    const shouldFetch = showModal || (enabled && fetchRequestId && lastRequestRef.current !== fetchRequestId) || (Array.isArray(initialData) && initialData.length > 0) || !initialData?.length;
    if (!shouldFetch) {
      if (Array.isArray(initialData)) setAllWinners(initialData);
      setLoading(false);
      return;
    }

    if (fetchRequestId) lastRequestRef.current = fetchRequestId;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('level', l));
        if (selectedRounds) query.append('round', selectedRounds);
        if (selectedBestOf) query.append('best_of', selectedBestOf?.toString() || '');
        query.set('limit', showModal ? '1000' : '100');

        const url = `/api/records/same/wins?${query.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch wins');
        const data = await res.json();
        setAllWinners(Array.isArray(data) ? data : []);
        setPage(1);
      } catch (err) {
        console.error(err);
        setAllWinners([]);
        setError('Failed to load records.');
      } finally {
        setLoading(false);
        if (enabled) setFetchEnabled?.(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, enabled, fetchRequestId, showModal, initialData, setFetchEnabled]);

  const hasRows = allWinners.length > 0;

  const totalPages = Math.ceil(allWinners.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = allWinners.slice(start, start + perPage);
  const isMostWinsAtSingleTournament = description === 'Most Wins at Single Tournament';
  const isMostWinsAtSingleGrandSlamTournament = description === 'Most Wins at Single Grand Slam Tournament';
  const isMostWinsAtSingleMasters1000Tournament = description === 'Most Wins at Single Masters 1000 Tournament';
  const isMostMatchesPlayedAtSingleTournament = description === 'Most Matches Played at Single Tournament';
  const findWinner = (playerName: string, tourneyName: string) =>
    allWinners.find(
      (row) =>
        row.player_name === playerName &&
        row.tourney_name === tourneyName,
    );
  const formatWins = (row?: Winner) => (row ? row.total_wins : 'n/a');
  const djokovicAustralianOpen = findWinner('Novak Djokovic', 'Australian Open');
  const djokovicWimbledon = findWinner('Novak Djokovic', 'Wimbledon');
  const djokovicRolandGarros = findWinner('Novak Djokovic', 'Roland Garros');
  const federerAustralianOpen = findWinner('Roger Federer', 'Australian Open');

  const renderTable = (data: Winner[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">#</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Wins</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Tournament</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const rank = startIndex + idx + 1;
            return (
              <tr key={`${p.winner_id}-${p.tourney_id}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center justify-center gap-2 text-lg text-gray-200">
                  <Flag ioc={p.ioc} className="w-4 h-3" />
                  <Link href={playerSurfaceOrMatchesUrl((p as any).winner_slug ?? String(p.winner_id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="hover:underline">
                    {p.player_name}
                  </Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.total_wins}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  <Link href={getTourneyHref({ slug: (p as any).tourney_slug ?? undefined, id: p.tourney_id, name: p.tourney_name })} className="hover:underline">{p.tourney_name}</Link>
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
        <div className="text-center py-8 text-gray-300">Failed to load records.</div>
      ) : loading && !hasRows ? (
        <div className="text-center py-8 text-gray-300">Loading...</div>
      ) : hasRows ? (
        <>
      {description && (
        <h2 className="mb-6 text-center text-2xl font-semibold text-white">
          {description}
        </h2>
      )}

      {isMostWinsAtSingleTournament && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 text-gray-200">
          <p>
            At the top of the Open Era list for <strong>Most Wins at a Single Tournament</strong> stands <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, with <strong className="!text-amber-300">112</strong> match wins at <Link href={getTourneyHref({ slug: 'roland-garros' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Roland Garros</Link> and a <strong className="!text-amber-300">112-3</strong> record there - the highest recorded total by a man at any single tournament. His Paris résumé is inseparable from his <strong className="!text-amber-300">14</strong> titles at Roland Garros, the most by any player at one Grand Slam event.
          </p>
          <p>
            Behind him, the next great single-tournament benchmarks are dominated by the Big Three. <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span> recorded <strong className="!text-amber-300">105</strong> wins at <Link href={getTourneyHref({ slug: 'wimbledon' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Wimbledon</Link> and <strong className="!text-amber-300">{federerAustralianOpen?.total_wins ?? 'n/a'}</strong> at the Australian Open, while <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span> reached <strong className="!text-amber-300">{formatWins(djokovicAustralianOpen)}</strong> wins at <Link href={getTourneyHref({ slug: 'australian-open' })} className="!text-orange-300 hover:!text-orange-100 font-semibold">Australian Open</Link> and also built a <strong className="!text-amber-300">{formatWins(djokovicWimbledon)}</strong>-win mark at Wimbledon. <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span> adds the classic American benchmark with <strong className="!text-amber-300">98</strong> wins at the US Open.
          </p>
          <p>
            In this record, the milestone is not simply longevity, but repeated dominance at the same venue across many seasons: Nadal's <strong className="!text-amber-300">112</strong> Roland Garros wins set the overall ceiling, while Federer, Djokovic and Connors show how the same tournament can become the stage for an entire career's best work.
          </p>
        </div>
      )}

      {isMostWinsAtSingleGrandSlamTournament && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 text-gray-200">
          <p>
            At the top of the Open Era list for <strong>Most Wins at a Single Grand Slam Tournament</strong> stands <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, with <strong className="!text-amber-300">112</strong> match wins at Roland Garros — the highest recorded men’s singles total at any major tournament. Guinness records Nadal’s Roland Garros dominance as <strong className="!text-amber-300">112</strong> wins from <strong className="!text-amber-300">115</strong> matches, alongside his unmatched 14 French Open titles.
          </p>
          <p>
            Behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, with <strong className="!text-amber-300">105</strong> wins at Wimbledon, where he won a men’s Open Era record 8 titles. ATP’s major-tournament wins list places Federer’s Wimbledon total second behind Nadal’s Roland Garros mark.
          </p>
          <p>
            The next major benchmark is <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span> at the Australian Open. In this record he sits at <strong className="!text-amber-300">{formatWins(djokovicAustralianOpen)}</strong> wins at Melbourne Park and remains the tournament’s all-time wins leader in the Open Era sample we are showing here. Federer’s Australian Open total remains another historic single-major mark, built around 10 titles in Melbourne.
          </p>
          <p>
            Djokovic is also unique because he has reached the 100-win mark at three different Grand Slam tournaments: the Australian Open, Roland Garros and Wimbledon. In this record he sits at <strong className="!text-amber-300">{formatWins(djokovicAustralianOpen)}</strong> in Melbourne, <strong className="!text-amber-300">{formatWins(djokovicRolandGarros)}</strong> in Paris and <strong className="!text-amber-300">{formatWins(djokovicWimbledon)}</strong> at Wimbledon, making him the only player to record 100+ wins at three different majors.
          </p>
          <p>
            A classic Open Era reference point is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span>, who recorded <strong className="!text-amber-300">98</strong> wins at the US Open, still one of the highest single-major totals and the leading non-Big-Three entry near the top of the list. 
          </p>
          <p>
            In this record, the milestone is not simply winning titles, but returning to the same major year after year and stacking victories across generations: Nadal set the ceiling at Roland Garros with 112, Federer owns the great Wimbledon benchmark at 105, and Djokovic is the modern all-surface major-wins outlier, with 100+ wins at three different Slams.
          </p>
        </div>
      )}

      {isMostWinsAtSingleMasters1000Tournament && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 text-gray-200">
          <p>
            At the top of the Open Era list for <strong>Most Wins at a Single Masters 1000 Tournament</strong> stands <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, with <strong className="!text-amber-300">73</strong> wins at the Monte-Carlo Masters, the highest recorded match-win total by any man at one ATP Masters 1000 event. The Masters 1000 series formally began in 1990, and ATP’s Masters 1000 records list Nadal as the Monte-Carlo win leader with <strong className="!text-amber-300">73</strong> victories.
          </p>
          <p>
            Nadal’s Monte-Carlo record is one of the most dominant single-tournament résumés in tennis history: he won the title 11 times, reached 12 finals, and produced an extraordinary run of 46 consecutive match wins at the event between 2005 and 2013. His dominance there was built on an unprecedented streak of 8 consecutive titles from 2005 to 2012, making Monte-Carlo the Masters 1000 equivalent of his Roland Garros supremacy.
          </p>
          <p>
            Behind Nadal’s Monte-Carlo mark comes his other clay reference point, <strong className="!text-amber-300">70</strong> wins at the Rome Masters, where he also won 10 titles. Next is <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span> with <strong className="!text-amber-300">66</strong> wins at Indian Wells.
          </p>
          <p>
            The next tier starts with the <strong className="!text-amber-300">59</strong>-win pair: <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> at Madrid and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span> at Miami. Just behind them comes <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, with <strong className="!text-amber-300">68</strong> wins in Rome, then <strong className="!text-amber-300">51</strong> at Indian Wells, <strong className="!text-amber-300">50</strong> in Paris, and <strong className="!text-amber-300">49</strong> in Miami. The rest of the list continues with <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span> at Cincinnati with <strong className="!text-amber-300">47</strong>, Djokovic at Cincinnati with <strong className="!text-amber-300">45</strong>, Djokovic at Shanghai with <strong className="!text-amber-300">43</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span> at Miami with <strong className="!text-amber-300">42</strong>, Nadal at Miami with <strong className="!text-amber-300">40</strong>, Djokovic at Monte Carlo with <strong className="!text-amber-300">39</strong>, and Nadal at Canada with <strong className="!text-amber-300">38</strong>.
          </p>
          <p>
            In this record, the milestone is not simply winning titles, but returning to the same Masters 1000 event year after year and stacking victories across eras: Nadal sets the ceiling at Monte-Carlo with <strong className="!text-amber-300">73</strong>, Nadal follows with <strong className="!text-amber-300">70</strong> in Rome, Djokovic adds the Rome benchmark with <strong className="!text-amber-300">68</strong>, Federer gives the hard-court benchmark at Indian Wells with <strong className="!text-amber-300">66</strong>, and the rest of the list fills out the sport’s other key Masters stops from Madrid and Miami to Paris, Cincinnati, Shanghai and Canada.
          </p>
        </div>
      )}

      {isMostMatchesPlayedAtSingleTournament && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 text-gray-200">
          <p>
            At the top of the Open Era list for <strong>Most Matches Played at a Single Tournament</strong> stands <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, who played 119 men’s singles matches at Wimbledon, finishing with a 105-14 record at the All England Club. That is the highest recorded total for any man at one tournament in the Open Era, built across a career that included 8 Wimbledon titles, 12 finals, and appearances from his debut in 1999 through his final Grand Slam match in 2021. [statistico.com], [rolandgarros.com]
          </p>
          <p>
            Behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> at Roland Garros, with 116 matches played and a staggering 112-4 record. Nadal’s Paris total is slightly below Federer’s Wimbledon match volume, but it is the most dominant single-tournament résumé in tennis history: 14 titles, a 96.6% win rate, and only four losses across his entire Roland Garros career. [rolandgarros.com], [apnews.com]
          </p>
          <p>
            The next major benchmark is <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Jimmy Connors</span></span> at the US Open, where he played 115 matches, posting a 98-17 record from 1970 to 1992. Connors remains the classic Open Era longevity case at one event: five US Open titles, 22 main-draw appearances, and the most US Open matches played by any man or woman in tournament history, [usopen.org]
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span> is also now in the same range at the Australian Open. After reaching the 2026 Australian Open final, Djokovic moved to 104 wins at Melbourne Park and became the tournament’s all-time wins leader; He owns this Australian Open record at 104-11, meaning 115 matches played.
          </p>
          <p>
            A separate non-Slam ATP reference point is Federer again at Basel, where he owns the highest win total at a regular ATP Tour event outside the majors, with 75 wins at the Swiss Indoors and a record 10 titles at his hometown tournament. [tennis365.com], [en.wikipedia.org]
          </p>
          <p>
            In this record, the milestone is not simply winning the most matches, but repeatedly returning to the same event and accumulating wins and losses across eras: Federer set the overall match-volume ceiling at Wimbledon with 119, Nadal owns the most dominant single-tournament record at Roland Garros, while Connors and Djokovic represent two different versions of extreme longevity at the US Open and Australian Open.
          </p>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {renderTable(currentData, start)}

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}

      <Modal show={showModal} onClose={() => setShowModal(false)} title="Top Wins in the Same Tournament">
        {renderTable(allWinners)}
      </Modal>
            </>
      ) : (
        <div className="text-center py-8 text-gray-300">No data available.</div>
      )}
    </section>
  );
}
