import type { Metadata, Viewport } from 'next';
import React from 'react';

export const viewport: Viewport = {
  width: 1100,
};

export const metadata: Metadata = {
  title: { absolute: 'Players - TennisMyLife' },
  description: 'Browse player profiles, stats and head-to-heads.',
  openGraph: {
    title: 'Players - TennisMyLife',
    description: 'Browse player profiles, stats and head-to-heads.',
    url: '/players',
    type: 'website',
  },
  alternates: { canonical: '/players' },
};

export default function PlayersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
