import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: { absolute: 'Rankings - TennisMyLife' },
  description: 'Latest ATP rankings and historical ranking tables.',
  openGraph: {
    title: 'Rankings - TennisMyLife',
    description: 'Latest ATP rankings and historical ranking tables.',
    url: 'https://stats.tennismylife.org/ranking',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', site: '@TennisMyLife68' },
  alternates: { canonical: 'https://stats.tennismylife.org/ranking' },
};

export default function RankingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
