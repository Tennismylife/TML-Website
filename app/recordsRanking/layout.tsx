import type { Metadata } from 'next';
import React from 'react';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const url = `${siteUrl}/recordsRanking`;

export const metadata: Metadata = {
  title: 'Records Ranking — TML',
  description: 'Ranked records and historical leaderboards.',
  openGraph: {
    title: 'Records Ranking — TML',
    description: 'Ranked records and historical leaderboards.',
    url,
    type: 'website',
  },
  alternates: { canonical: url },
};

export default function RecordsRankingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
