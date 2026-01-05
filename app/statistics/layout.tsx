import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Statistics — TML',
  description: 'Player and match statistics across seasons and tournaments.',
  openGraph: {
    title: 'Statistics — TML',
    description: 'Player and match statistics across seasons and tournaments.',
    url: '/statistics',
    type: 'website',
  },
  alternates: { canonical: '/statistics' },
};

export default function StatisticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
