// Server component — renders <a href> links crawlable by Google.
// 1. When filters are active: links to all OTHER record types with the SAME filters
//    + links to all OTHER filters on the SAME record type (cross-filter navigation)
// 2. When no filters: links to the most important single-filter variants of this record type

import { shouldShowRecordFilter } from '../../lib/records/allowed-filters';
import { resolveCanonicalRecordHref } from './record-links';

type Filters = {
  level?: string[];
  surface?: string[];
  round?: string;
  bestOf?: number | null;
};

type RecordPage = { tab: string; sub: string | null; label: string };

const ALL_RECORD_PAGES: RecordPage[] = [
  { tab: 'wins',            sub: null,              label: 'Most Wins' },
  { tab: 'played',          sub: null,              label: 'Most Played' },
  { tab: 'titles',          sub: null,              label: 'Most Titles' },
  { tab: 'entries',         sub: null,              label: 'Most Entries' },
  { tab: 'count',           sub: null,              label: 'Match Count' },
  { tab: 'percentage',      sub: null,              label: 'Win Percentage' },
  { tab: 'ages',            sub: 'oldest',          label: 'Oldest in Draw' },
  { tab: 'ages',            sub: 'youngest',        label: 'Youngest in Draw' },
  { tab: 'ages',            sub: 'oldest-winners',  label: 'Oldest Title Winners' },
  { tab: 'ages',            sub: 'youngest-winners',label: 'Youngest Title Winners' },
  { tab: 'timespan',        sub: 'entries',         label: 'Timespan Between Entries' },
  { tab: 'timespan',        sub: 'titles',          label: 'Timespan Between Titles' },
  { tab: 'timespan',        sub: 'rounds',          label: 'Timespan Between Finals' },
  { tab: 'roundsonentries', sub: 'titles',          label: 'Titles per Entry' },
  { tab: 'roundsonentries', sub: 'round',           label: 'Round per Entry' },
  { tab: 'same',            sub: 'wins',            label: 'Wins at Same Tournament' },
  { tab: 'same',            sub: 'titles',          label: 'Titles at Same Tournament' },
  { tab: 'same',            sub: 'entries',         label: 'Entries at Same Tournament' },
  { tab: 'same',            sub: 'round',           label: 'Round at Same Tournament' },
  { tab: 'seasons',         sub: 'wins',            label: 'Wins per Season' },
  { tab: 'seasons',         sub: 'titles',          label: 'Titles per Season' },
  { tab: 'seasons',         sub: 'percentage',      label: 'Win % per Season' },
  { tab: 'seasons',         sub: 'round',           label: 'Round per Season' },
  { tab: 'atage',           sub: 'wins',            label: 'Wins at Age' },
  { tab: 'atage',           sub: 'titles',          label: 'Titles at Age' },
  { tab: 'atage',           sub: 'entries',         label: 'Entries at Age' },
  { tab: 'atage',           sub: 'round',           label: 'Round at Age' },
  { tab: 'ageofnth',        sub: 'wins',            label: 'Age at Nth Win' },
  { tab: 'ageofnth',        sub: 'titles',          label: 'Age at Nth Title' },
  { tab: 'neededto',        sub: 'titles',          label: 'Entries Needed for Title' },
  { tab: 'counterseasons',  sub: 'wins',            label: 'Wins Counter Seasons' },
  { tab: 'counterseasons',  sub: 'titles',          label: 'Titles Counter Seasons' },
  { tab: 'counterseasons',  sub: 'round',           label: 'Round Counter Seasons' },
  { tab: 'streak',          sub: 'wins',            label: 'Longest Winning Streak' },
  { tab: 'streak',          sub: 'round',           label: 'Longest Round Streak' },
  { tab: 'h2h',             sub: 'count',           label: 'Head-to-Head' },
];

// Alternative filters to suggest on the same record type
const LEVEL_OPTIONS = [
  { value: 'G',   label: 'Grand Slams' },
  { value: 'M',   label: 'Masters 1000' },
  { value: 'F',   label: 'ATP Finals' },
  { value: '500', label: 'ATP 500' },
  { value: '250', label: 'ATP 250' },
];
const SURFACE_OPTIONS = [
  { value: 'Hard',  label: 'Hard Court' },
  { value: 'Clay',  label: 'Clay Court' },
  { value: 'Grass', label: 'Grass Court' },
];

function subToPolicyKey(sub?: string | null) {
  if (!sub) return undefined;
  return sub.includes('-')
    ? sub.split('-').map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))).join('')
    : sub;
}

function getRecordSlugPath(tab: string | null, sub: string | null, filters: Filters): string | null {
  if (!tab) return null;
  const slug = sub ? [tab, sub] : [tab];
  return resolveCanonicalRecordHref(slug, {
    level: filters.level,
    surface: filters.surface,
    round: filters.round,
    bestOf: filters.bestOf ?? undefined,
  });
}

export default function RelatedRecordsLinks({
  currentTab,
  currentSub,
  filters,
}: {
  currentTab: string | null;
  currentSub: string | null;
  filters: Filters;
}) {
  const hasFilters =
    (filters.level?.length ?? 0) > 0 ||
    (filters.surface?.length ?? 0) > 0 ||
    !!filters.round ||
    filters.bestOf != null;

  const currentSlugPath = getRecordSlugPath(currentTab, currentSub, {});

  // ── UNFILTERED: suggest the main level + surface variants for this record type
  if (!hasFilters) {
    const slug = currentSub ? [currentTab!, currentSub] : [currentTab!];
    return (
      <nav aria-label="Explore this record by level and surface" className="mt-10 border-t border-gray-700 pt-6">
        <h2 className="text-base font-semibold text-gray-300 mb-3">Explore by level &amp; surface</h2>
        <div className="flex flex-col gap-3">
          <div>
            <span className="text-xs uppercase tracking-wide text-gray-500 mr-2">Level:</span>
            <span className="inline-flex flex-wrap gap-2">
              {LEVEL_OPTIONS.map(o => {
                const href = resolveCanonicalRecordHref(slug, { level: [o.value] });
                if (!href) return null;
                return (
                  <a key={o.value} href={href}
                    className="px-3 py-1 rounded-full text-sm bg-gray-800 text-gray-400 hover:bg-indigo-700 hover:text-white transition-colors">
                    {o.label}
                  </a>
                );
              })}
            </span>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-gray-500 mr-2">Surface:</span>
            <span className="inline-flex flex-wrap gap-2">
              {SURFACE_OPTIONS.map(o => {
                const href = resolveCanonicalRecordHref(slug, { surface: [o.value] });
                if (!href) return null;
                return (
                  <a key={o.value} href={href}
                    className="px-3 py-1 rounded-full text-sm bg-gray-800 text-gray-400 hover:bg-indigo-700 hover:text-white transition-colors">
                    {o.label}
                  </a>
                );
              })}
            </span>
          </div>
        </div>
      </nav>
    );
  }

  // ── FILTERED: (A) same filters on other record types + (B) same record type with other filters
  const otherPages = ALL_RECORD_PAGES.filter(
    p => !(p.tab === currentTab && p.sub === currentSub)
  );

  // Build alternative single-filter variants for the same page,
  // excluding the currently active filter value
  const currentLevel = filters.level?.[0];
  const currentSurface = filters.surface?.[0];

  const altLevels = LEVEL_OPTIONS.filter(o => o.value !== currentLevel);
  const altSurfaces = SURFACE_OPTIONS.filter(o => o.value !== currentSurface);
  const slug = currentSub ? [currentTab!, currentSub] : [currentTab!];

  return (
    <>
      {/* A — same type, different filters */}
      <nav aria-label="Same record, other filters" className="mt-10 border-t border-gray-700 pt-6">
        <h2 className="text-base font-semibold text-gray-300 mb-3">
          Same record, other filters
        </h2>
        <div className="flex flex-col gap-3">
              {altLevels.length > 0 && (
            <div>
              <span className="text-xs uppercase tracking-wide text-gray-500 mr-2">Level:</span>
              <span className="inline-flex flex-wrap gap-2">
                {altLevels.map(o => {
                  const targetFilters = currentSurface ? { level: [o.value], surface: [currentSurface] } : { level: [o.value] };
                  const href = resolveCanonicalRecordHref(slug, targetFilters);
                  if (!href) return null;
                  return (
                    <a key={o.value}
                      href={href}
                      className="px-3 py-1 rounded-full text-sm bg-gray-800 text-gray-400 hover:bg-indigo-700 hover:text-white transition-colors">
                      {o.label}
                    </a>
                  );
                })}
                {(() => {
                  const href = currentSurface
                    ? resolveCanonicalRecordHref(slug, { surface: [currentSurface] })
                    : currentSlugPath;
                  if (!href) return null;
                  return (
                    <a href={href}
                      className="px-3 py-1 rounded-full text-sm bg-gray-800 text-gray-400 hover:bg-indigo-700 hover:text-white transition-colors">
                      All Levels
                    </a>
                  );
                })()}
              </span>
            </div>
          )}
          {altSurfaces.length > 0 && (
            <div>
              <span className="text-xs uppercase tracking-wide text-gray-500 mr-2">Surface:</span>
              <span className="inline-flex flex-wrap gap-2">
                {altSurfaces.map(o => {
                  const targetFilters = currentLevel ? { level: [currentLevel], surface: [o.value] } : { surface: [o.value] };
                  const href = resolveCanonicalRecordHref(slug, targetFilters);
                  if (!href) return null;
                  return (
                    <a key={o.value}
                      href={href}
                      className="px-3 py-1 rounded-full text-sm bg-gray-800 text-gray-400 hover:bg-indigo-700 hover:text-white transition-colors">
                      {o.label}
                    </a>
                  );
                })}
                {(() => {
                  const href = currentLevel
                    ? resolveCanonicalRecordHref(slug, { level: [currentLevel] })
                    : currentSlugPath;
                  if (!href) return null;
                  return (
                    <a href={href}
                      className="px-3 py-1 rounded-full text-sm bg-gray-800 text-gray-400 hover:bg-indigo-700 hover:text-white transition-colors">
                      All Surfaces
                    </a>
                  );
                })()}
              </span>
            </div>
          )}
        </div>
      </nav>

      {/* B — same filters on other record types */}
      <nav aria-label="Related records with the same filters" className="mt-6 border-t border-gray-700 pt-6">
        <h2 className="text-base font-semibold text-gray-300 mb-3">
          Same filters, other record types
        </h2>
        <ul className="flex flex-wrap gap-2">
          {otherPages.map(page => {
            const targetFilters = {
              ...(filters.level?.length && shouldShowRecordFilter('levels', page.tab, subToPolicyKey(page.sub)) ? { level: filters.level } : {}),
              ...(filters.surface?.length && shouldShowRecordFilter('surfaces', page.tab, subToPolicyKey(page.sub)) ? { surface: filters.surface } : {}),
              ...(filters.round && shouldShowRecordFilter('rounds', page.tab, subToPolicyKey(page.sub)) ? { round: filters.round } : {}),
              ...(filters.bestOf != null && shouldShowRecordFilter('bestOf', page.tab, subToPolicyKey(page.sub)) ? { bestOf: filters.bestOf } : {}),
            };
            const slug = page.sub ? [page.tab, page.sub] : [page.tab];
            const href = resolveCanonicalRecordHref(slug, targetFilters);
            if (!href) return null;
            return (
              <li key={`${page.tab}-${page.sub}`}>
                <a
                  href={href}
                  className="px-3 py-1 rounded-full text-sm bg-gray-800 text-gray-400 hover:bg-indigo-700 hover:text-white transition-colors"
                >
                  {page.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
