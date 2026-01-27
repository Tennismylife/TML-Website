import { Suspense } from "react";
import { redirect } from 'next/navigation';
import type { Metadata } from 'next'
import StatisticsInner from "./StatisticsInner";

export const metadata: Metadata = {
  title: 'Statistics',
  description: 'Player and match statistics across seasons and tournaments.',
  alternates: { canonical: 'https://stats.tennismylife.org/statistics' },
  openGraph: {
    title: 'Statistics - TennisMyLife',
    description: 'Player and match statistics across seasons and tournaments.',
    url: 'https://stats.tennismylife.org/statistics',
    type: 'website',
    images: [
      { url: 'https://stats.tennismylife.org/og/site-preview.png', width: 1200, height: 630, alt: 'Statistics - TennisMyLife' }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@TennisMyLife68',
    creator: '@TennisMyLife68',
  },
};

export default function StatisticsPage({ searchParams }: { searchParams?: Record<string, string> }) {
  // If no stat is provided in query params, redirect to the canonical /statistics/aces
  const stat = searchParams?.stat;
  if (!stat) redirect('/statistics/aces');

  return (
    <Suspense fallback={<div className="text-white p-4">Loading...</div>}>
      <StatisticsInner />
    </Suspense>
  );
}
