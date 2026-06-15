'use client'

import React from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';
import Flag from '@/components/Flag';
import CountSection from './CountSection';
import TimespanSection from './TimespanSection';
import { getTourneyHref, createSlug } from '@/lib/utils';

interface H2HSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  selectedBestOf: number | null;
  activeSubTab?: string;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | number | null;
  prefetchedData?: Record<string, any[] | undefined>;
  description?: string;
}

export default function H2HSection({ 
  selectedSurfaces, 
  selectedLevels, 
  selectedRounds, 
  selectedBestOf, 
  activeSubTab,
  fetchEnabled,
  setFetchEnabled,
  fetchRequestId,
  prefetchedData,
  description
}: H2HSectionProps) {
  const [showModal, setShowModal] = React.useState(false);
  const effectiveFetchId = fetchRequestId != null ? String(fetchRequestId) : undefined;
  const hasPrefetch = !!(prefetchedData && Object.values(prefetchedData).some(Boolean));
  const enabled = !!fetchEnabled || hasPrefetch;

  if (!enabled && !showModal) {
    return (
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-200">Head-to-Head (H2H)</h2>
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
          >
            View All
          </button>
        </div>
        <div className="py-8 text-center text-gray-300">Clicca "View All" per caricare i dati H2H.</div>
      </section>
    );
  }

  const commonProps = {
    selectedSurfaces,
    selectedLevels,
    selectedRounds,
    selectedBestOf,
    fetchEnabled,
    setFetchEnabled,
    fetchRequestId: effectiveFetchId,
    description,
  } as const;

  const isMostPlayedHeadToHead = description === 'Most Played Head-to-Head';
  const tableDescription = isMostPlayedHeadToHead && activeSubTab === 'count' ? '' : description;

  return (
    <section className="rounded p-4">
      {isMostPlayedHeadToHead && activeSubTab === 'count' && (
        <h2 className="mb-10 text-center text-3xl sm:text-4xl font-semibold text-white">
          Head-to-Head (H2H)
        </h2>
      )}
      {isMostPlayedHeadToHead && activeSubTab === 'count' && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg text-sm leading-relaxed space-y-4 text-gray-200">
          <p>
            This Open Era head-to-head record page tracks the most played rivalries in men’s tennis, combining raw meeting totals, win-loss splits and historical context across the sport’s biggest stages.
          </p>
          <p>
            At the top of the list stands the rivalry between <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" />Novak Djokovic</span> and <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" />Rafael Nadal</span>, the most played men’s head-to-head of the Open Era. Djokovic and Nadal faced each other <strong className="!text-amber-300">60</strong> times, with Djokovic finishing ahead <strong className="!text-amber-300">31–29</strong>. What makes this rivalry unique is not only the number, but the span and density of the meetings. Their first match came at Roland Garros in 2006, when Nadal won after Djokovic retired in the quarter-finals; their 60th meeting came 18 years later, at the Paris 2024 Olympics, where Djokovic won 6–1, 6–4 on Court Philippe-Chatrier. Over nearly two decades, they met in Grand Slams, major finals and Olympic competition, turning their head-to-head into the statistical centrepiece of the Big Three era.
          </p>
          <p>
            Behind them stands <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" />Novak Djokovic</span> vs <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" />Roger Federer</span>, the second-most played men’s rivalry of the Open Era. They met <strong className="!text-amber-300">50</strong> times, with Djokovic leading <strong className="!text-amber-300">27–23</strong>. Federer and Djokovic’s rivalry stretched from 2006 to 2020 and became especially important at the biggest events. They met repeatedly in Grand Slam semi-finals and finals, including Wimbledon finals in 2014, 2015 and 2019, and their final match came at the 2020 Australian Open semi-final, won by Djokovic. If Djokovic–Nadal was the rivalry of attrition and physical resistance, Djokovic–Federer was often a contrast between Federer’s attacking elegance and Djokovic’s return-based control.
          </p>
          <p>
            The third major pillar is <span className="inline-flex items-center gap-2"><Flag ioc="CHE" className="w-4 h-3" />Roger Federer</span> vs <span className="inline-flex items-center gap-2"><Flag ioc="ESP" className="w-4 h-3" />Rafael Nadal</span>, who played <strong className="!text-amber-300">40</strong> times, with Nadal leading <strong className="!text-amber-300">24–16</strong>. Federer–Nadal did not reach the same raw volume as Djokovic–Nadal or Djokovic–Federer, but it became the defining rivalry of the 2000s. Their meetings were concentrated on the biggest stages: Roland Garros finals, Wimbledon finals and Australian Open finals. The contrast was immediate and iconic — Federer’s first-strike, all-court game against Nadal’s left-handed topspin, physicality and clay-court dominance.
          </p>
          <p>
            The next tier belongs to rivalries that reached the mid-30s. <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" />John McEnroe</span> and <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" />Ivan Lendl</span> also played <strong className="!text-amber-300">37</strong> times, with Lendl leading <strong className="!text-amber-300">21–16</strong>. <span className="inline-flex items-center gap-2"><Flag ioc="SRB" className="w-4 h-3" />Novak Djokovic</span> and <span className="inline-flex items-center gap-2"><Flag ioc="GBR" className="w-4 h-3" />Andy Murray</span> played <strong className="!text-amber-300">36</strong> times, with Djokovic leading <strong className="!text-amber-300">25–11</strong>.
          </p>
          <p>
            Just behind them are two 35-match rivalries from the 1980s and 1990s. <span className="inline-flex items-center gap-2"><Flag ioc="DEU" className="w-4 h-3" />Boris Becker</span> and <span className="inline-flex items-center gap-2"><Flag ioc="SWE" className="w-4 h-3" />Stefan Edberg</span> met <strong className="!text-amber-300">35</strong> times, with Becker leading <strong className="!text-amber-300">25–10</strong>. <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" />Jimmy Connors</span> and <span className="inline-flex items-center gap-2"><Flag ioc="CZE" className="w-4 h-3" />Ivan Lendl</span> also met <strong className="!text-amber-300">35</strong> times, with Lendl leading <strong className="!text-amber-300">22–13</strong>.
          </p>
          <p>
            Then come two classic American rivalries at 34 meetings. <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" />Pete Sampras</span> and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" />Andre Agassi</span> played <strong className="!text-amber-300">34</strong> times, with Sampras leading <strong className="!text-amber-300">20–14</strong>. <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" />Jimmy Connors</span> and <span className="inline-flex items-center gap-2"><Flag ioc="USA" className="w-4 h-3" />John McEnroe</span> also reached <strong className="!text-amber-300">34</strong> meetings, with McEnroe leading <strong className="!text-amber-300">20–14</strong>.
          </p>
          <p>
            That is why Djokovic–Nadal at 60 matches stands apart. It is not just the most played head-to-head in men’s Open Era tennis; it is a record built across almost every important competitive setting: clay, hard courts, grass, Grand Slams, major finals and the Olympics. Federer–Djokovic reached 50, Federer–Nadal reached 40, and several great rivalries stopped in the mid-30s — but no men’s pairing has matched the sheer volume, longevity and historical weight of Djokovic vs Nadal.
          </p>
        </div>
      )}
      {activeSubTab === 'count' && (
        <CountSection
          {...commonProps}
          description={tableDescription}
          initialData={prefetchedData?.count as any[] | undefined}
          parentShowModal={showModal}
        />
      )}
      {activeSubTab === 'timespan' && (
        <TimespanSection
          {...commonProps}
          initialData={prefetchedData?.timespan as any[] | undefined}
          parentShowModal={showModal}
        />
      )} 

      <Modal show={showModal} onClose={() => setShowModal(false)} title="H2H — Full Data">
        {activeSubTab === 'count' && (
          <CountSection
            {...commonProps}
            fetchEnabled
            initialData={prefetchedData?.count as any[] | undefined}
            parentShowModal
          />
        )}
        {activeSubTab === 'timespan' && (
          <TimespanSection
            {...commonProps}
            fetchEnabled
            initialData={prefetchedData?.timespan as any[] | undefined}
            parentShowModal
          />
        )}
      </Modal>
    </section>
  );
}




