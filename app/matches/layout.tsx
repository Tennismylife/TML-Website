import type { Metadata } from 'next';
import React from 'react';

const site = 'https://stats.tennismylife.org';

export const metadata: Metadata = {
  title: { absolute: 'Matches - TennisMyLife' },
  description: 'Latest match results, scores and schedules.',
  openGraph: {
    title: 'Matches - TennisMyLife',
    description: 'Latest match results, scores and schedules.',
    url: `${site}/matches`,
    type: 'website',
  },
  alternates: { canonical: `${site}/matches` },
};

export default function MatchesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
