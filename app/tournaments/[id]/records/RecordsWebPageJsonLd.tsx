import React from 'react';
import { metadataBase } from '@/lib/site';

type RecordsWebPageJsonLdProps = {
  pageTitle: string;
  pageDescription: string;
  canonical: string;
  keywords?: string;
  aboutArr?: Array<Record<string, any>>;
};

export default function RecordsWebPageJsonLd({
  pageTitle,
  pageDescription,
  canonical,
  keywords,
  aboutArr = [],
}: RecordsWebPageJsonLdProps) {
  const canonicalOrigin = metadataBase;

  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: pageTitle,
    description: pageDescription,
    url: canonical,
    inLanguage: 'en-US',
    isPartOf: { '@type': 'WebSite', name: 'TennisMyLife', url: canonicalOrigin.toString() },
    ...(aboutArr.length ? { about: aboutArr } : {}),
    ...(keywords ? { keywords } : {}),
    dateModified: new Date().toISOString(),
  };

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}