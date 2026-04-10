import React from 'react';
import Link from 'next/link';

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
  return tab.split(/[-_\s]+/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

export default function SEOBreadcrumb({ slug, name, tab }: SEOBreadcrumbProps) {
  const base = 'https://stats.tennismylife.org';
  const playerUrl = `${base}/players/${slug}`;

  const items: any[] = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: base },
    { '@type': 'ListItem', position: 2, name, item: playerUrl },
  ];

  const crumbs: { label: string; href: string }[] = [
    { label: 'Home', href: '/' },
    { label: name, href: `/players/${slug}` },
  ];

  if (tab && tab !== 'overview') {
    // tab kept for future use but not added to breadcrumb
  }

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <nav aria-label="Breadcrumb" className="sr-only">
        <ol>
          {crumbs.map((c, i) => (
            <li key={c.href}>
              {i < crumbs.length - 1 ? (
                <Link href={c.href}>{c.label}</Link>
              ) : (
                <span aria-current="page">{c.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
