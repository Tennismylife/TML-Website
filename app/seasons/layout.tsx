import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Seasons — TML',
  description: 'Season summaries and statistics.',
  openGraph: {
    title: 'Seasons — TML',
    description: 'Season summaries and statistics.',
    url: '/seasons',
    type: 'website',
  },
  alternates: { canonical: '/seasons' },
};

export default function SeasonsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
