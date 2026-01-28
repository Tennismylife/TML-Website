import type { Metadata } from 'next';
import React from 'react';

const site = 'https://stats.tennismylife.org';

export const metadata: Metadata = {
  title: { absolute: 'Head-to-Head - TennisMyLife' },
  description: 'Head-to-head statistics between players.',
  openGraph: {
    title: 'Head-to-Head - TennisMyLife',
    description: 'Head-to-head statistics between players.',
    url: `${site}/h2h`,
    type: 'website',
  },
  alternates: { canonical: `${site}/h2h` },
};

export default function H2HLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
