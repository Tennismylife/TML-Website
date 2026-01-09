import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Records Ranking — TML',
  description: 'Ranked records and historical leaderboards.',
  openGraph: {
    title: 'Records Ranking — TML',
    description: 'Ranked records and historical leaderboards.',
    url: '/recordsRanking',
    type: 'website',
  },
  alternates: { canonical: '/recordsRanking' },
};

export default function RecordsRankingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
