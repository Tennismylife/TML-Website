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
  let path = `/records/${encodeURIComponent(record)}`;
  if (sub) path += `/${encodeURIComponent(sub)}`;
  if (filters && Object.keys(filters).length > 0) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v == null) continue;
      if (Array.isArray(v)) v.forEach(x => params.append(k, x));
      else params.append(k, String(v));
    }
    path += `?${params.toString()}`;
  }
  return path;
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
