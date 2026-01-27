import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: { absolute: 'Head-to-Head - TennisMyLife' },
  description: 'Head-to-head statistics between players.',
  openGraph: {
    title: 'Head-to-Head - TennisMyLife',
    description: 'Head-to-head statistics between players.',
    url: '/h2h',
    type: 'website',
  },
  alternates: { canonical: '/h2h' },
};

export default function H2HLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
