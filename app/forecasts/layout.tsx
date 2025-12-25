import type { Metadata } from 'next';
import React from 'react';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const url = `${siteUrl}/forecasts`;

export const metadata: Metadata = {
  title: 'Forecasts — TML',
  description: 'Match and tournament forecasts and predictions.',
  openGraph: {
    title: 'Forecasts — TML',
    description: 'Match and tournament forecasts and predictions.',
    url,
    type: 'website',
  },
  alternates: { canonical: url },
};

export default function ForecastsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
