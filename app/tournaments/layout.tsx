import type { Metadata } from 'next';
import React from 'react';

const site = 'https://stats.tennismylife.org';

export const metadata: Metadata = {
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

export default function TournamentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
