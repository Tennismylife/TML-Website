import type { Metadata } from 'next';
import React from 'react';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const url = `${siteUrl}/player-vs-player`;

export const metadata: Metadata = {
  title: 'Player vs Player — TML',
  description: 'Compare two players head-to-head and stats.',
  openGraph: {
    title: 'Player vs Player — TML',
    description: 'Compare two players head-to-head and stats.',
    url,
    type: 'website',
  },
  alternates: { canonical: url },
};

export default function PvpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
