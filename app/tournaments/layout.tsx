import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: { absolute: 'Tournaments - TennisMyLife' },
  description: 'Tournament listings, past champions and records.',
  alternates: {
    canonical: '/tournaments',
  },
  openGraph: {
    title: 'Tournaments - TennisMyLife',
    description: 'Tournament listings, past champions and records.',
    url: '/tournaments',
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
