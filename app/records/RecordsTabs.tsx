"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { generateRecordDescription } from '@/lib/generateRecordDescription';
import { keyFromParamLabel } from '@/lib/levels';
import { buildContextualRecordsPath, resolveCanonicalRecordHref, resolveRecordHref } from './record-links';

type Tab = { key: string; label: string };

type RecordsTabsProps = {
  activeTab?: string | null;
  activeSubTab?: string | null;
};

const kebabToKey = (s: string | undefined) => {
  if (!s) return s;
  // Handle kebab-case first (e.g. 'oldest-winners' -> 'oldestWinners')
  if (s.includes('-')) {
    return s.split('-').map((part, idx) => idx === 0 ? part : (part.charAt(0).toUpperCase() + part.slice(1))).join('');
  }

  // Handle concatenated forms (e.g. 'oldestwinners' -> 'oldestWinners', 'oldestmaindraw' -> 'oldestMainDraw')
  const suffixMap: Record<string, string> = { winners: 'Winners', maindraw: 'MainDraw' };
  const lower = s.toLowerCase();
  for (const [suffix, camel] of Object.entries(suffixMap)) {
    if (lower.endsWith(suffix)) {
      const prefix = s.slice(0, s.length - suffix.length);
      return prefix + camel;
    }
  }

  return s;
};

const tabs: Tab[] = [
  { key: 'wins', label: 'Wins' },
  { key: 'played', label: 'Played' },
  { key: 'rounds', label: 'Rounds' },
  { key: 'titles', label: 'Titles' },
  { key: 'entries', label: 'Appearances' },
  { key: 'ages', label: 'Ages' },
  { key: 'timespan', label: 'Timespan' },
  { key: 'percentage', label: 'Percentage' },
  { key: 'roundsonentries', label: 'Results by Appearances' },
  { key: 'same', label: 'Single Tournament' },
  { key: 'seasons', label: 'Single Season' },
  { key: 'atage', label: 'At Age' },
  { key: 'ageofnth', label: 'Age at Nth' },
  { key: 'neededto', label: 'Needed To' },
  { key: 'counterseasons', label: 'Counter Seasons' },
  { key: 'h2h', label: 'H2H' },
  { key: 'streak', label: 'Streak' },
];

const TAB_CANONICAL_HREF: Record<string, string> = {
  wins: '/records/most-career-wins',
  played: '/records/most-matches-played',
  rounds: '/records/most-finals-reached',
  titles: '/records/most-atp-titles',
  entries: '/records/most-appearances',
  percentage: '/records/best-winning-percentage',
  ages: '/records/oldest-players-in-main-draw',
  timespan: '/records/longest-appearance-timespan',
  roundsonentries: '/records/most-titles-per-appearance',
  same: '/records/most-wins-at-single-tournament',
  seasons: '/records/most-wins-in-single-season',
  counterseasons: resolveCanonicalRecordHref(['counterseasons', 'round'], { round: 'F' }) ?? resolveRecordHref(['counterseasons', 'round'], { round: 'F' }),
  streak: '/records/longest-winning-streak',
  h2h: '/records/most-played-h2h',
};

const ACTIVE_SUBTAB_DEFAULTS: Record<string, string> = {
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

const subTabs: Record<string, Tab[]> = {
  ages: [
    { key: 'oldest', label: 'Oldest Main Draw' },
    { key: 'youngest', label: 'Youngest Main Draw' },
    { key: 'oldest-winners', label: 'Oldest Title Winners' },
    { key: 'youngest-winners', label: 'Youngest Title Winners' },
  ],
  timespan: [
    { key: 'entries', label: '2 appearances' },
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
    { key: 'entries', label: 'Appearances' },
    { key: 'titles', label: 'Titles' },
    { key: 'round', label: 'Round' },
  ],
  seasons: [
    { key: 'wins', label: 'Wins' },
    { key: 'played', label: 'Played' },
    { key: 'entries', label: 'Appearances' },
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
    { key: 'wins', label: 'Wins' },
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
        const merged = { ...ACTIVE_SUBTAB_DEFAULTS, [active]: camel };
        const mergedClean = Object.fromEntries(Object.entries(merged).map(([k, v]) => [k, v ?? ''])) as Record<string, string>;
        const desc = generateRecordDescription(active, mergedClean, selectedSurfaces, selectedLevels as any, selectedRounds as any, selectedBestOf as any);
        if (desc && typeof document !== 'undefined') {
          const currentTitle = typeof document !== 'undefined' ? document.title || '' : '';
          const currentIsSiteSeo = typeof currentTitle === 'string' && /\| Tennis/.test(currentTitle);
          if (!currentIsSiteSeo) {
            document.title = `${desc} | Tennis Records`;
            // reapply after short delay only if the server hasn't already set a proper SEO title
            t = setTimeout(() => { if (typeof document !== 'undefined' && !/\| Tennis Records/.test(document.title || '')) document.title = `${desc} | Tennis Records`; }, 200);
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
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${key === activeTab ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`;

  const subTabClass = (key: string) => {
    const camel = kebabToKey(key);
    return `px-3 py-1 rounded transition-colors duration-150 ${camel === activeSubTab ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`;
  }

  const getSubTabHref = (tabKey: string, subKey: string) => {
    const filters =
      (tabKey === 'timespan' && subKey === 'rounds') ||
      (tabKey === 'seasons' && subKey === 'round')
        ? { round: 'F' }
        : {};
    return resolveRecordHref([tabKey, subKey], filters);
  };

  const getMenuTooltip = (tabKey: string, subKey?: string) => {
    const effectiveSub = kebabToKey(subKey || (subTabs[tabKey]?.[0]?.key ?? ACTIVE_SUBTAB_DEFAULTS[tabKey] ?? ''));
    const merged = { ...ACTIVE_SUBTAB_DEFAULTS, [tabKey]: effectiveSub || '' };
    const selectedRounds = tabKey === 'timespan' && subKey === 'rounds' ? 'F' : '';
    return generateRecordDescription(tabKey, merged, new Set(), new Set(), selectedRounds, null) || tabKey;
  };

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
        if (!currentIsSiteSeo) document.title = `${desc} | Tennis Records`;
      }
    } catch (e) {
      // ignore
    }
  }

  return (
    <nav ref={navRef} className="mb-4 flex flex-wrap gap-2 bg-gray-800/40 rounded-2xl p-3 shadow-lg w-full justify-center" aria-label="Record tabs">
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
            href={TAB_CANONICAL_HREF[tab.key] ?? (
              firstSub
                ? getSubTabHref(tab.key, firstSub)
                : buildContextualRecordsPath(tab.key)
            )}
            title={getMenuTooltip(tab.key, firstSub)}
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
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
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
                      href={getSubTabHref(tab.key, st.key)}
                      title={getMenuTooltip(tab.key, st.key)}
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
