import { type RecordFilters } from './seo/records-policy';
import { resolveRecordHref } from '../app/records/record-links';

type FilterValue = string | string[];

export interface RecordLink {
  record: string;
  sub?: string;
  filters?: Record<string, FilterValue>;
  href: string;
}

export function generateRecordLink(
  record: string,
  sub?: string,
  filters?: Record<string, FilterValue>
): string {
  const recordFilters: RecordFilters = {};
  for (const [k, v] of Object.entries(filters ?? {})) {
    if (v == null) continue;
    const values = Array.isArray(v) ? v.map(String) : [String(v)];
    if (k === 'level') recordFilters.level = values;
    if (k === 'surface') recordFilters.surface = values;
    if (k === 'round') recordFilters.round = values[0];
    if (k === 'bestOf') recordFilters.bestOf = Number(values[0]);
    if (k === 'subtab') recordFilters.subtab = values[0];
  }

  return resolveRecordHref([record, ...(sub ? [sub] : [])], recordFilters);
}

export function generateAllRecordLinks(
  tabs: string[],
  subTabsMap: Record<string, string[]>,
  filtersList?: Record<string, FilterValue>[]
): RecordLink[] {
  const links: RecordLink[] = [];

  tabs.forEach(tab => {
    links.push({ record: tab, href: generateRecordLink(tab) });
    const subtabs = subTabsMap[tab] || [];
    subtabs.forEach(sub => {
      links.push({ record: tab, sub, href: generateRecordLink(tab, sub) });
      if (filtersList) {
        filtersList.forEach(f => {
          links.push({ record: tab, sub, filters: f, href: generateRecordLink(tab, sub, f) });
        });
      }
    });
  });

  return links;
}
