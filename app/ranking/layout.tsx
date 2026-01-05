import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Rankings — TML',
  description: 'Latest ATP rankings and historical ranking tables.',
  openGraph: {
    title: 'Rankings — TML',
    description: 'Latest ATP rankings and historical ranking tables.',
    url: '/ranking',
    type: 'website',
  },
  alternates: { canonical: '/ranking' },
};

export default function RankingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
