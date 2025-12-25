import type { Metadata } from 'next';
import React from 'react';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const url = `${siteUrl}/rankingtables`;

export const metadata: Metadata = {
  title: 'Ranking Tables — TML',
  description: 'Historical ranking tables and snapshots.',
  openGraph: {
    title: 'Ranking Tables — TML',
    description: 'Historical ranking tables and snapshots.',
    url,
    type: 'website',
  },
  alternates: { canonical: url },
};

export default function RankingTablesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
