import { tourMetadata } from "@/lib/tour-metadata";
import type { Metadata } from 'next';
import React from 'react';

const site = 'https://stats.tennismylife.org';

const metadata: Metadata = {
  title: { absolute: 'Seasons - TennisMyLife' },
  description: 'Season summaries and statistics.',
  openGraph: {
    title: 'Seasons - TennisMyLife',
    description: 'Season summaries and statistics.',
    url: `${site}/seasons`,
    type: 'website',
  },
  alternates: { canonical: `${site}/seasons` },
};

export async function generateMetadata() {
  return tourMetadata(metadata);
}

export default function SeasonsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
