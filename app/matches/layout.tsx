import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Matches — TML',
  description: 'Latest match results, scores and schedules.',
  openGraph: {
    title: 'Matches — TML',
    description: 'Latest match results, scores and schedules.',
    url: '/matches',
    type: 'website',
  },
  alternates: { canonical: '/matches' },
};

export default function MatchesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
