import React from 'react';

interface SEOBreadcrumbProps {
  slug: string;
  name: string;
  tab?: string | null;
}

function capitalizeTab(tab: string) {
  const map: Record<string, string> = {
    matches: 'Matches',
    titles: 'Titles',
    h2h: 'H2H',
    overview: 'Overview',
    clay: 'Clay Court Stats',
    hard: 'Hard Court Stats',
    grass: 'Grass Court Stats',
  };
  if (map[tab]) return map[tab];
  // Fallback Title Case
  return tab.split(/[-_\s]+/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

export default function SEOBreadcrumb({ slug, name, tab }: SEOBreadcrumbProps) {
  const base = 'https://stats.tennismylife.org';
  const items: any[] = [
    { '@type': 'ListItem', position: 1, name: 'Players', item: `${base}/players` },
    { '@type': 'ListItem', position: 2, name: name, item: `${base}/players/${slug}` },
  ];

  if (tab && tab !== 'overview') {
    items.push({ '@type': 'ListItem', position: 3, name: capitalizeTab(tab), item: `${base}/players/${slug}/${tab}` });
  }

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />;
}
