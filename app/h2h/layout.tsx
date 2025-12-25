import type { Metadata } from 'next';
import React from 'react';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const url = `${siteUrl}/h2h`;

export const metadata: Metadata = {
  title: 'Head-to-Head — TML',
  description: 'Head-to-head statistics between players.',
  openGraph: {
    title: 'Head-to-Head — TML',
    description: 'Head-to-head statistics between players.',
    url,
    type: 'website',
  },
  alternates: { canonical: url },
};

export default function H2HLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
