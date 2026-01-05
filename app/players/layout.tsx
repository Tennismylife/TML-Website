import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Players — TML',
  description: 'Browse player profiles, stats and head-to-heads.',
  openGraph: {
    title: 'Players — TML',
    description: 'Browse player profiles, stats and head-to-heads.',
    url: '/players',
    type: 'website',
  },
  alternates: { canonical: '/players' },
};

export default function PlayersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
