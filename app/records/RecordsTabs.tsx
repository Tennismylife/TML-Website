"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { generateRecordDescription } from '@/lib/generateRecordDescription';
import { keyFromParamLabel } from '@/lib/levels';

type Tab = { key: string; label: string };

type RecordsTabsProps = {
  activeTab?: string | null;
  activeSubTab?: string | null;
};

const kebabToKey = (s: string | undefined) => {
  if (!s) return s;
  return s.split('-').map((part, idx) => idx === 0 ? part : (part.charAt(0).toUpperCase() + part.slice(1))).join('');
};

const tabs: Tab[] = [
  { key: 'wins', label: 'Wins' },
  { key: 'played', label: 'Played' },
  { key: 'count', label: 'Count' },
  { key: 'titles', label: 'Titles' },
  { key: 'entries', label: 'Entries' },
  { key: 'ages', label: 'Ages' },
  { key: 'timespan', label: 'Timespan' },
  { key: 'percentage', label: 'Percentage' },
  { key: 'roundsonentries', label: 'Rounds on Entries' },
  { key: 'same', label: 'Same' },
  { key: 'seasons', label: 'Seasons' },
  { key: 'atage', label: 'At Age' },
  { key: 'ageofnth', label: 'Age at Nth' },
  { key: 'neededto', label: 'Needed To' },
  { key: 'counterseasons', label: 'Counter Seasons' },
  { key: 'h2h', label: 'H2H' },
  { key: 'streak', label: 'Streak' },
];

const subTabs: Record<string, Tab[]> = {
  ages: [
    { key: 'oldest', label: 'Oldest Main Draw' },
    { key: 'youngest', label: 'Youngest Main Draw' },
    { key: 'oldest-winners', label: 'Oldest Winners' },
    { key: 'youngest-winners', label: 'Youngest Winners' },
  ],
  timespan: [
    { key: 'entries', label: '2 entries' },
    { key: 'titles', label: '2 titles' },
    { key: 'rounds', label: '2 rounds' },
  ],
  roundsonentries: [
    { key: 'titles', label: 'Titles' },
    { key: 'round', label: 'Round' },
  ],
  same: [
    { key: 'wins', label: 'Wins' },
    { key: 'played', label: 'Played' },
    { key: 'entries', label: 'Entries' },
    { key: 'titles', label: 'Titles' },
    { key: 'round', label: 'Round' },
  ],
  seasons: [
    { key: 'wins', label: 'Wins' },
    { key: 'played', label: 'Played' },
    { key: 'entries', label: 'Entries' },
    { key: 'titles', label: 'Titles' },
    { key: 'round', label: 'Round' },
    { key: 'percentage', label: 'Percentage' },
  ],
  atage: [
    { key: 'wins', label: 'Wins' },
    { key: 'played', label: 'Played' },
    { key: 'entries', label: 'Entries' },
    { key: 'titles', label: 'Titles' },
    { key: 'slams', label: 'Slams' },
    { key: 'round', label: 'Round' },
  ],
  ageofnth: [
    { key: 'wins', label: 'Wins' },
    { key: 'played', label: 'Played' },
    { key: 'entries', label: 'Entries' },
    { key: 'titles', label: 'Titles' },
    { key: 'slams', label: 'Slams' },
    { key: 'round', label: 'Round' },
  ],
  neededto: [{ key: 'titles', label: 'Titles' }],
  counterseasons: [
    { key: 'round', label: 'Rounds' },
    { key: 'titles', label: 'Titles' },
  ],
  streak: [
    { key: 'wins', label: 'Wins' },
    { key: 'round', label: 'Round' },
  ],
  h2h: [{ key: 'count', label: 'Count' }],
};

export default function RecordsTabs({ activeTab: activeTabProp, activeSubTab }: RecordsTabsProps) {
  const [activeTab, setActiveTab] = useState<string | null>(activeTabProp || null);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setActiveTab(activeTabProp || null);
  }, [activeTabProp]);

  // Ensure the browser title stays in sync after navigation: recompute description whenever
  // the active tab/subtab or search params change and set the document title again (with a short debounce)
  useEffect(() => {
    // Do not let tab logic override carefully crafted site SEO titles for Least records
    if (activeTabProp === 'least') return;

    // If a server-provided SEO title is present, avoid overwriting it
    if (typeof document !== 'undefined' && /\| Tennis Records/.test(document.title || '')) return;

    let t: any = null;
    try {
      const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams('');
      const toArray = (v?: string | string[]) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]));
      const selectedSurfaces = new Set(sp.getAll('surface').map(s => (s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())));
      const levelParams = sp.getAll('level');
      const selectedLevels = new Set(levelParams.map(p => { const k = keyFromParamLabel(p); return k || String(p).toUpperCase(); }));
      const selectedRounds = (sp.get('round') || '').toUpperCase();
      const selectedBestOf = sp.get('bestOf') ? Number(sp.get('bestOf')) : null;

      const camel = kebabToKey(activeSubTab || undefined);
      const active = activeTabProp || null;
      if (active) {
        const activeSubTabsDefault: Record<string,string> = {
          ages: 'oldest',
          timespan: 'entries',
          roundsonentries: 'titles',
          same: 'wins',
          seasons: 'wins',
          atage: 'wins',
          ageofnth: 'wins',
          neededto: 'titles',
          counterseasons: 'round',
          streak: 'wins',
          h2h: 'count',
        };
        const merged = { ...activeSubTabsDefault, [active]: camel };
        const mergedClean = Object.fromEntries(Object.entries(merged).map(([k, v]) => [k, v ?? ''])) as Record<string, string>;
        const desc = generateRecordDescription(active, mergedClean, selectedSurfaces, selectedLevels as any, selectedRounds as any, selectedBestOf as any);
        if (desc && typeof document !== 'undefined') {
          const currentTitle = typeof document !== 'undefined' ? document.title || '' : '';
          const currentIsSiteSeo = typeof currentTitle === 'string' && /\| Tennis/.test(currentTitle);
          if (!currentIsSiteSeo) {
            document.title = `${desc} — TML`;
            // reapply after short delay to avoid being overwritten by other flows
            t = setTimeout(() => { if (typeof document !== 'undefined') document.title = `${desc} — TML`; }, 200);
          }
        }
      }
    } catch (e) {
      // ignore
    }
    return () => { if (t) clearTimeout(t); };
  }, [activeTabProp, activeSubTab]);

  // Close opened subtab menus when clicking/tapping outside the nav (mobile friendly)
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setHoveredTab(null);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  const tabClass = (key: string) =>
    `px-4 py-2 rounded-xl font-medium transition-colors duration-200 ${key === activeTab ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`;

  const subTabClass = (key: string) => {
    const camel = kebabToKey(key);
    return `px-3 py-1 rounded transition-colors duration-150 ${camel === activeSubTab ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`;
  }

  // When a subtab is clicked, update the browser title immediately to match the description
  function handleSubtabClick(tabKey: string, subKey: string) {
    try {
      const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const toArray = (v?: string | string[]) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]));
      const selectedSurfaces = new Set(sp.getAll('surface').map(s => (s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())));
      const levelParams = sp.getAll('level');
      const selectedLevels = new Set(levelParams.map(p => { const k = keyFromParamLabel(p); return k || String(p).toUpperCase(); }));
      const selectedRounds = (sp.get('round') || '').toUpperCase();
      const selectedBestOf = sp.get('bestOf') ? Number(sp.get('bestOf')) : null;

      const activeSubTabsDefault: Record<string,string> = {
        ages: 'oldest',
        timespan: 'entries',
        roundsonentries: 'titles',
        same: 'wins',
        seasons: 'wins',
        atage: 'wins',
        ageofnth: 'wins',
        neededto: 'titles',
        counterseasons: 'round',
        streak: 'wins',
        h2h: 'count',
      };

      const camel = kebabToKey(subKey);
      const merged = { ...activeSubTabsDefault, [tabKey]: camel };
      const mergedClean = Object.fromEntries(Object.entries(merged).map(([k, v]) => [k, v ?? ''])) as Record<string, string>;
      const desc = generateRecordDescription(tabKey, mergedClean, selectedSurfaces, selectedLevels as any, selectedRounds as any, selectedBestOf as any);
      if (desc && typeof document !== 'undefined') {
        const currentTitle = typeof document !== 'undefined' ? document.title || '' : '';
        const currentIsSiteSeo = typeof currentTitle === 'string' && /\| Tennis/.test(currentTitle);
        if (!currentIsSiteSeo) document.title = `${desc} — TML`;
      }
    } catch (e) {
      // ignore
    }
  }

  return (
    <nav ref={navRef} className="mb-4 flex flex-wrap gap-3 bg-gray-800/40 rounded-2xl p-4 shadow-lg w-full justify-center" aria-label="Record tabs">
      {tabs.map(tab => {
        const firstSub = subTabs[tab.key]?.[0]?.key;
        const isActive = tab.key === activeTab;
        return (
        <div
          key={tab.key}
          className="relative"
          onMouseEnter={() => setHoveredTab(tab.key)}
          onMouseLeave={() => setHoveredTab(null)}
        >
          <Link
            href={firstSub ? `/records/${encodeURIComponent(tab.key)}?subtab=${encodeURIComponent(firstSub)}` : `/records/${encodeURIComponent(tab.key)}`}
            onClick={(e) => {
              setHoveredTab(null);
              if (firstSub) {
                // On small screens (mobile) open the subtab menu instead of navigating directly
                if (typeof window !== 'undefined' && window.innerWidth <= 768) {
                  e.preventDefault();
                  setHoveredTab(prev => (prev === tab.key ? null : tab.key));
                  return;
                }
                // Desktop: navigate to default first subtab and precompute title
                handleSubtabClick(tab.key, firstSub);
              }
            }}
            className={`px-4 py-2 rounded-xl font-medium transition-colors duration-200 ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
          >
            {tab.label}
          </Link>

          {subTabs[tab.key] && (
            <AnimatePresence>
              {(hoveredTab === tab.key) && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute left-0 mt-2 flex flex-col gap-1 bg-gray-900 p-2 rounded-lg shadow-lg z-10"
                >
                  {subTabs[tab.key].map(st => (
                    <Link
                      key={st.key}
                      href={`/records/${encodeURIComponent(tab.key)}?subtab=${encodeURIComponent(st.key)}`}
                      onClick={() => { setActiveTab(null); setHoveredTab(null); handleSubtabClick(tab.key, st.key); }}
                      className={subTabClass(st.key)}
                    >
                      {st.label}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
        )
      })}
    </nav>
  );
}
