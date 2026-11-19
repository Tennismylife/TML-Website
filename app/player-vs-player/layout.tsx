import { tourMetadata } from "@/lib/tour-metadata";
import type { Metadata } from 'next';
import React from 'react';

const metadata: Metadata = {
  title: { absolute: 'Player vs Player - TennisMyLife' },
  description: 'Compare two players head-to-head and stats.',
  openGraph: {
    title: 'Player vs Player - TennisMyLife',
    description: 'Compare two players head-to-head and stats.',
    url: '/player-vs-player',
    type: 'website',
  },
  alternates: { canonical: '/player-vs-player' },
};

export async function generateMetadata() {
  return tourMetadata(metadata);
}

export default function PvpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
