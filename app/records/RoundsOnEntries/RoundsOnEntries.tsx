'use client'

import React, { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import Flag from '@/components/Flag';
import Titles from './Titles';
import Rounds from './Rounds';

interface RoundsonentriesProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  activeSubTab?: string;
  fetchEnabled?: boolean;
  fetchRequestId?: string | null;
  description?: string;
  prefetchedData?: Record<string, any[] | undefined>;
}

type NarrativeRow = {
  id?: string | number;
  name: string;
  ioc: string;
  entries?: number;
  wins?: number;
  percentage?: number;
};

export default function Roundsonentries({
  selectedSurfaces,
  selectedLevels,
  selectedRounds,
  activeSubTab,
  fetchEnabled,
  fetchRequestId,
  description,
  prefetchedData,
}: RoundsonentriesProps) {
  const enabled = !!fetchEnabled;
  const [minEntries, setMinEntries] = useState(1);
  const pathname = usePathname();

  const isMostTitlesPerAppearance =
    description === 'Most Titles per Appearance' ||
    pathname === '/records/most-titles-per-appearance';
  const isMostGrandSlamTitlesPerAppearance =
    description === 'Most Grand Slam Titles per Appearance' ||
    pathname === '/records/most-grand-slam-titles-per-appearance';
  const isMostMasters1000TitlesPerAppearance =
    description === 'Most Masters 1000 Titles per Appearance' ||
    pathname === '/records/most-masters-1000-titles-per-appearance';

  const narrativeRows = useMemo(() => {
    return ((prefetchedData?.titles ?? prefetchedData?.round) as NarrativeRow[] | undefined) ?? [];
  }, [prefetchedData]);

  const findPlayer = (name: string) => narrativeRows.find((p) => p.name === name);
  const formatPct = (value?: number) =>
    typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}%` : 'n/a';
  const formatWl = (player?: NarrativeRow) => {
    if (!player || typeof player.entries !== 'number' || typeof player.wins !== 'number') return 'n/a';
    return `${player.wins}-${player.entries - player.wins}`;
  };

  const djokovic = findPlayer('Novak Djokovic');
  const alcaraz = findPlayer('Carlos Alcaraz');
  const federer = findPlayer('Roger Federer');
  const borg = findPlayer('Bjorn Borg');
  const nadal = findPlayer('Rafael Nadal');
  const laver = findPlayer('Rod Laver');
  const sampras = findPlayer('Pete Sampras');
  const agassi = findPlayer('Andre Agassi');
  const muster = findPlayer('Thomas Muster');
  const mcenroe = findPlayer('John McEnroe');
  const lendl = findPlayer('Ivan Lendl');

  return (
    <section className="mb-8">
      {description && (
        <h2 className="mb-6 text-center text-2xl font-semibold text-white">
          {description}
        </h2>
      )}

      {isMostTitlesPerAppearance && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 text-gray-200">
          <p>
            At the top of the list for <strong>Most ATP Titles per Appearance</strong> stands <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Rod Laver</span></span>, who converted <strong className="!text-amber-300">{laver?.wins ?? 'n/a'}</strong> titles from <strong className="!text-amber-300">{laver?.entries ?? 'n/a'}</strong> appearances into trophies at a remarkable <strong className="!text-amber-300">{formatPct(laver?.percentage)}</strong> rate - the highest recorded title-per-appearance ratio among major Open Era men&apos;s players. In practical terms, Laver won more than one title every three tournaments entered, making him the purest efficiency benchmark in this category rather than simply a volume-title leader.
          </p>
          <p>
            Behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Bjorn Borg</span></span>, with <strong className="!text-amber-300">{borg?.wins ?? 'n/a'}</strong> titles from <strong className="!text-amber-300">{borg?.entries ?? 'n/a'}</strong> appearances, equal to <strong className="!text-amber-300">{formatPct(borg?.percentage)}</strong>. Borg remains the great modern-style efficiency comparison: a shorter career than most all-time greats, but an exceptional conversion rate whenever he entered a tournament. Just behind Borg is <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, whose <strong className="!text-amber-300">{djokovic?.wins ?? 'n/a'}</strong> titles from <strong className="!text-amber-300">{djokovic?.entries ?? 'n/a'}</strong> appearances give him a <strong className="!text-amber-300">{formatPct(djokovic?.percentage)}</strong> rate - extraordinary because it combines Borg-like efficiency with far greater career longevity and volume.
          </p>
          <p>
            The next tier is extremely tight: <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span> sits at <strong className="!text-amber-300">{nadal?.wins ?? 'n/a'}</strong> titles from <strong className="!text-amber-300">{nadal?.entries ?? 'n/a'}</strong> appearances, or <strong className="!text-amber-300">{formatPct(nadal?.percentage)}</strong>; <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Ivan Lendl</span></span> at <strong className="!text-amber-300">{lendl?.wins ?? 'n/a'}</strong> from <strong className="!text-amber-300">{lendl?.entries ?? 'n/a'}</strong>, or <strong className="!text-amber-300">{formatPct(lendl?.percentage)}</strong>; and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>John McEnroe</span></span> at <strong className="!text-amber-300">{mcenroe?.wins ?? 'n/a'}</strong> from <strong className="!text-amber-300">{mcenroe?.entries ?? 'n/a'}</strong>, or <strong className="!text-amber-300">{formatPct(mcenroe?.percentage)}</strong>. All three show different versions of elite title efficiency: Nadal through clay-court dominance, Lendl through week-to-week consistency, and McEnroe through peak-level conversion across singles events.
          </p>
          <p>
            In this record, the milestone is not simply winning the most titles, but converting tournament appearances into trophies at the highest rate: Laver set the ceiling at {formatPct(laver?.percentage)}, but that mark is also less comparable because he began the Open Era in his prime; Borg remains the classic Open Era efficiency outlier, while Djokovic is the modern benchmark - a player with both a 100-title career and a title-per-appearance rate above 32%.
          </p>
        </div>
      )}

      {isMostGrandSlamTitlesPerAppearance && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 text-gray-200">
          <p>
            At the top of the strict Open Era list for <strong>Most Grand Slam Titles per Appearance</strong> stands <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" /><span>Bjorn Borg</span></span>, who won <strong className="!text-amber-300">{borg?.wins ?? 'n/a'}</strong> Grand Slam titles from <strong className="!text-amber-300">{borg?.entries ?? 'n/a'}</strong> major appearances, converting <strong className="!text-amber-300">{formatPct(borg?.percentage)}</strong> of his Slam entries into titles. Borg&apos;s Grand Slam profile is uniquely efficient: he won 6 Roland Garros titles and 5 Wimbledon titles, while playing very few Australian Opens and retiring from regular top-level competition at just 25.
          </p>
          <p>
            Behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Carlos Alcaraz</span></span>, the modern small-sample outlier, with <strong className="!text-amber-300">{alcaraz?.wins ?? 'n/a'}</strong> titles from <strong className="!text-amber-300">{alcaraz?.entries ?? 'n/a'}</strong> Grand Slam appearances, equal to <strong className="!text-amber-300">{formatPct(alcaraz?.percentage)}</strong>. His sample is still much smaller than Djokovic, Nadal or Federer, but his early Grand Slam efficiency already places him ahead of many established champions in title-per-entry terms.
          </p>
          <p>
            A separate historical bridge is <span className="inline-flex items-center gap-2"><Flag ioc="AUS" className="w-4 h-3" /><span>Rod Laver</span></span>. If counted strictly in the Open Era, Laver won <strong className="!text-amber-300">{laver?.wins ?? 'n/a'}</strong> Grand Slam titles from <strong className="!text-amber-300">{laver?.entries ?? 'n/a'}</strong> Open Era major appearances, or <strong className="!text-amber-300">{formatPct(laver?.percentage)}</strong>; if his full amateur + Open Era Slam career is counted, he stands as the historical bridge between eras.
          </p>
          <p>
            Then comes <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, with <strong className="!text-amber-300">{nadal?.wins ?? 'n/a'}</strong> titles from <strong className="!text-amber-300">{nadal?.entries ?? 'n/a'}</strong> Grand Slam appearances, equal to <strong className="!text-amber-300">{formatPct(nadal?.percentage)}</strong>. His ratio is driven above all by Roland Garros, where he won a record 14 titles, but unlike Borg or Alcaraz, Nadal sustained that efficiency across nearly two decades of major competition.
          </p>
          <p>
            Behind Nadal are <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, with <strong className="!text-amber-300">{djokovic?.wins ?? 'n/a'}</strong> titles from <strong className="!text-amber-300">{djokovic?.entries ?? 'n/a'}</strong> appearances - <strong className="!text-amber-300">{formatPct(djokovic?.percentage)}</strong> - and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span>, with <strong className="!text-amber-300">{sampras?.wins ?? 'n/a'}</strong> titles from <strong className="!text-amber-300">{sampras?.entries ?? 'n/a'}</strong> appearances - <strong className="!text-amber-300">{formatPct(sampras?.percentage)}</strong>. Djokovic is the volume-and-longevity benchmark, while Sampras remains the classic 1990s efficiency reference, especially through Wimbledon and the US Open.
          </p>
          <p>
            <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span> follows with <strong className="!text-amber-300">{federer?.wins ?? 'n/a'}</strong> titles from <strong className="!text-amber-300">{federer?.entries ?? 'n/a'}</strong> Grand Slam appearances, or <strong className="!text-amber-300">{formatPct(federer?.percentage)}</strong> - lower than Borg, Nadal and Djokovic by percentage, but built across one of the longest and most consistent major careers in tennis history.
          </p>
          <p>
            In this record, the milestone is not simply winning the most majors, but converting Grand Slam entries into trophies: Borg set the pure Open Era efficiency ceiling, Alcaraz is the active small-sample threat, Laver is the pre/Open bridge, while Nadal and Djokovic are the high-volume modern standards.
          </p>
        </div>
      )}

      {isMostMasters1000TitlesPerAppearance && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-3 text-gray-200">
          <p>
            At the top of the list for <strong>Most Masters 1000 Titles per Appearance</strong> stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" /><span>Novak Djokovic</span></span>, who has converted <strong className="!text-amber-300">{djokovic?.wins ?? 'n/a'}</strong> Masters 1000 titles from <strong className="!text-amber-300">{djokovic?.entries ?? 'n/a'}</strong> appearances into a <strong className="!text-amber-300">{formatPct(djokovic?.percentage)}</strong> title-per-entry rate - the highest recorded efficiency mark at this level. The Masters 1000 category formally began in 1990, and ATP lists Djokovic as the all-time title leader with <strong className="!text-amber-300">{djokovic?.wins ?? 'n/a'}</strong> Masters 1000 trophies.
          </p>
          <p>
            Behind him comes <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Rafael Nadal</span></span>, with <strong className="!text-amber-300">{nadal?.wins ?? 'n/a'}</strong> titles from <strong className="!text-amber-300">{nadal?.entries ?? 'n/a'}</strong> appearances, equal to <strong className="!text-amber-300">{formatPct(nadal?.percentage)}</strong>. Nadal&apos;s efficiency is driven above all by his clay-court dominance at Monte-Carlo, Rome, and Madrid/Hamburg, where he built a large part of his Masters 1000 legacy. ATP lists Nadal second all-time with <strong className="!text-amber-300">{nadal?.wins ?? 'n/a'}</strong> Masters 1000 titles.
          </p>
          <p>
            A separate modern small-sample benchmark is <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" /><span>Carlos Alcaraz</span></span>, who appears third with <strong className="!text-amber-300">{alcaraz?.wins ?? 'n/a'}</strong> titles from <strong className="!text-amber-300">{alcaraz?.entries ?? 'n/a'}</strong> appearances, giving him a <strong className="!text-amber-300">{formatPct(alcaraz?.percentage)}</strong> conversion rate. His sample is still much smaller than Djokovic, Nadal or Federer, but his early Masters 1000 efficiency already places him ahead of many established champions in title-per-entry terms.
          </p>
          <p>
            Then comes <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" /><span>Roger Federer</span></span>, with <strong className="!text-amber-300">{federer?.wins ?? 'n/a'}</strong> titles from <strong className="!text-amber-300">{federer?.entries ?? 'n/a'}</strong> appearances, equal to <strong className="!text-amber-300">{formatPct(federer?.percentage)}</strong>. Federer ranks third all-time in total Masters 1000 titles, behind Djokovic and Nadal, but his title-per-appearance rate is lower because his Masters career stretched across a very long calendar span and many more non-title entries.
          </p>
          <p>
            Behind the Big Three and Alcaraz, the next notable names include <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Andre Agassi</span></span>, with <strong className="!text-amber-300">{agassi?.wins ?? 'n/a'}</strong> titles from <strong className="!text-amber-300">{agassi?.entries ?? 'n/a'}</strong> appearances for <strong className="!text-amber-300">{formatPct(agassi?.percentage)}</strong>, <span className="inline-flex items-center gap-2"><Flag ioc="AUT" className="w-4 h-3" /><span>Thomas Muster</span></span>, with <strong className="!text-amber-300">{muster?.wins ?? 'n/a'}</strong> titles from <strong className="!text-amber-300">{muster?.entries ?? 'n/a'}</strong> appearances for <strong className="!text-amber-300">{formatPct(muster?.percentage)}</strong>, and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" /><span>Pete Sampras</span></span>, with <strong className="!text-amber-300">{sampras?.wins ?? 'n/a'}</strong> from <strong className="!text-amber-300">{sampras?.entries ?? 'n/a'}</strong> for <strong className="!text-amber-300">{formatPct(sampras?.percentage)}</strong>.
          </p>
          <p>
            In this record, the milestone is not simply winning the most Masters 1000 titles, but converting appearances into trophies at the highest rate: Djokovic set the efficiency ceiling at {formatPct(djokovic?.percentage)}, Nadal is the clay-driven challenger just behind him, Alcaraz is the active small-sample threat, and Federer remains the long-career consistency benchmark behind the top two.
          </p>
        </div>
      )}

      {/* Minimum Entries Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-white">Minimum Entries: {minEntries}</label>
        <input
          type="range"
          min="1"
          max="100"
          value={minEntries}
          onChange={(e) => setMinEntries(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {activeSubTab === 'titles' ? (
        <Titles
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          minEntries={minEntries}
          fetchEnabled={enabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.titles as any[]}
        />
      ) : (
        <Rounds
          selectedSurfaces={selectedSurfaces}
          selectedLevels={selectedLevels}
          selectedRounds={selectedRounds}
          minEntries={minEntries}
          fetchEnabled={enabled}
          fetchRequestId={fetchRequestId}
          description={description}
          initialData={prefetchedData?.round as any[]}
        />
      )}
    </section>
  );
}
