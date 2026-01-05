import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Player vs Player — TML',
  description: 'Compare two players head-to-head and stats.',
  openGraph: {
    title: 'Player vs Player — TML',
    description: 'Compare two players head-to-head and stats.',
    url: '/player-vs-player',
    type: 'website',
  },
  alternates: { canonical: '/player-vs-player' },
};

export default function PvpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
