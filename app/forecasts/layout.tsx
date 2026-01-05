import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Forecasts — TML',
  description: 'Match and tournament forecasts and predictions.',
  openGraph: {
    title: 'Forecasts — TML',
    description: 'Match and tournament forecasts and predictions.',
    url: '/forecasts',
    type: 'website',
  },
  alternates: { canonical: '/forecasts' },
};

export default function ForecastsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
