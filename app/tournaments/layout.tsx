import { tourMetadata } from "@/lib/tour-metadata";
import type { Metadata } from 'next';
import React from 'react';

const site = 'https://stats.tennismylife.org';

const metadata: Metadata = {
  title: { absolute: 'Tournaments - TennisMyLife' },
  description: 'Tournament listings, past champions and records.',
  alternates: {
    canonical: `${site}/tournaments`,
  },
  openGraph: {
    title: 'Tournaments - TennisMyLife',
    description: 'Tournament listings, past champions and records.',
    url: `${site}/tournaments`,
    type: 'website',
  },
};

export async function generateMetadata() {
  return tourMetadata(metadata);
}

export default function TournamentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
