import { tourMetadata } from "@/lib/tour-metadata";
import type { Metadata } from 'next';
import React from 'react';

const metadata: Metadata = {
  title: { absolute: 'Forecasts - TennisMyLife' },
  description: 'Match and tournament forecasts and predictions.',
  openGraph: {
    title: 'Forecasts - TennisMyLife',
    description: 'Match and tournament forecasts and predictions.',
    url: '/forecasts',
    type: 'website',
  },
  alternates: { canonical: '/forecasts' },
};

export async function generateMetadata() {
  return tourMetadata(metadata);
}

export default function ForecastsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
