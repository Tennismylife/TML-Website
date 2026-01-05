import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Ranking Tables — TML',
  description: 'Historical ranking tables and snapshots.',
  openGraph: {
    title: 'Ranking Tables — TML',
    description: 'Historical ranking tables and snapshots.',
    url: '/rankingtables',
    type: 'website',
  },
  alternates: { canonical: '/rankingtables' },
};

export default function RankingTablesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
