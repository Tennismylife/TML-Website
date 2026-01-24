import path from 'path';
import fs from 'fs';
import React from 'react';

export const runtime = 'nodejs';

const DATA_DIR = path.join(process.cwd(), 'data');
const FALLBACK_JSON = path.join(process.cwd(), 'app', 'tennis-match-database', 'prebuilt-metadata.json');

type Distribution = {
  '@type': 'DataDownload';
  contentUrl: string;
  encodingFormat: string;
  name?: string;
  description: string;
  dateModified?: string;
  contentSize?: string;
};

async function getDatasetMetadata() {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://stats.tennismylife.org').replace(/\/+$/u, '');

  const distributions: Distribution[] = [];
  const years: number[] = [];
  let latestModified: Date | null = null;
  let hasWTA = false;

  // Try to read actual CSVs (Node runtime)
  try {
    if (fs && fs.existsSync(DATA_DIR)) {
      const files = fs.readdirSync(DATA_DIR).filter((f: string) => /\.csv$/i.test(f));
      files.sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }));

      for (const f of files) {
        if (/wta/i.test(f)) hasWTA = true;
        const matchYears = f.match(/\b(19\d{2}|20\d{2})\b/g);
        if (matchYears) matchYears.forEach(y => years.push(parseInt(y, 10)));

        const fp = path.join(DATA_DIR, f);
        try {
          if (fs.existsSync(fp)) {
            const st = fs.statSync(fp);
            const dateModified = st.mtime.toISOString();
            const contentSize = `${st.size} bytes`;
            if (!latestModified || st.mtime > latestModified) latestModified = st.mtime;

            distributions.push({
              '@type': 'DataDownload',
              contentUrl: `${site}/data/${encodeURIComponent(f)}`,
              encodingFormat: 'text/csv',
              name: f,
              description: `Complete match data for ${f.replace(/\.csv$/i, '')}`,
              dateModified,
              contentSize,
            });
          }
        } catch (e) {
          // ignore per-file errors
        }
      }
    }
  } catch (e) {
    // If filesystem isn't available (Edge) or reading failed, fall back to prebuilt JSON
    try {
      // try dynamic import of bundled JSON
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const prebuilt = JSON.parse(fs.readFileSync(FALLBACK_JSON, 'utf8')) as any;
      if (prebuilt) {
        if (Array.isArray(prebuilt.distribution)) prebuilt.distribution.forEach((d: any) => distributions.push(d));
        if (prebuilt.years) prebuilt.years.forEach((y: number) => years.push(y));
        if (prebuilt.latestModified) latestModified = new Date(prebuilt.latestModified);
        if (prebuilt.hasWTA) hasWTA = !!prebuilt.hasWTA;
      }
    } catch (err) {
      // final fallback - leave distributions empty
      console.error('Failed to load CSVs and no prebuilt metadata available for tennis-match-database', err);
    }
  }

  const minYear = years.length ? Math.min(...years) : 1968;
  const maxYear = years.length ? Math.max(...years) : 2026;
  const title = `Tennis Match Database (${minYear}–${maxYear}) - TennisMyLife`;
  const description = `Download the Tennis Match Database from ${minYear} to ${maxYear}, including ATP match results and ongoing tournaments, in CSV format.`;

  const keywords = ['tennis', 'matches', 'ATP', 'statistics', 'csv'];
  if (hasWTA && !keywords.includes('WTA')) keywords.splice(3, 0, 'WTA');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: title,
    url: `${site}/tennis-match-database`,
    // Dataset Catalog / identifiers for Dataset Search
    includedInDataCatalog: { '@type': 'DataCatalog', name: 'TML Tennis Data', url: site },
    sameAs: [site],
    creator: {
      '@type': 'Organization',
      name: 'Tennis My Life',
      url: site,
    },
    maintainer: { '@type': 'Organization', name: 'Tennis My Life', url: site },
    publisher: { '@type': 'Organization', name: 'Tennis My Life', url: site },
    measurementTechnique: ['Official ATP IDs; daily ingestion; verified historical corrections'],
    variableMeasured: [
      'tourney_id','tourney_name','surface','draw_size','tourney_level','indoor','tourney_date','match_num',
      'winner_id','winner_seed','winner_entry','winner_name','winner_hand','winner_ht','winner_ioc','winner_age','winner_rank','winner_rank_points',
      'loser_id','loser_seed','loser_entry','loser_name','loser_hand','loser_ht','loser_ioc','loser_age','loser_rank','loser_rank_points',
      'score','best_of','round','minutes','w_ace','w_df','w_svpt','w_1stIn','w_1stWon','w_2ndWon','w_SvGms','w_bpSaved','w_bpFaced',
      'l_ace','l_df','l_svpt','l_1stIn','l_1stWon','l_2ndWon','l_SvGms','l_bpSaved','l_bpFaced'
    ],
    description:
      'A curated, continuously-updated collection of professional tennis match results (singles) with extensive metadata and CSV exports. Includes historical and ongoing tournament data, match scores, player identifiers, surfaces, and basic event-level metadata for analysis and research. Download the files directly as CSV or use the provided API for programmatic access.',
    isAccessibleForFree: true,
    license: 'https://opensource.org/licenses/MIT',
    identifier: {
      '@type': 'PropertyValue',
      propertyID: 'url',
      value: `${site}/tennis-match-database`,
    },
    temporalCoverage: `${minYear}/${maxYear}`,
    dateModified: latestModified ? latestModified.toISOString() : undefined,
    distribution: distributions,
    keywords,
  } as const;

  return { site, title, description, minYear, maxYear, keywords, jsonLd };
}

function JsonLdScript({ json }: { json: any }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

export async function generateMetadata() {
  const { site, title, description, minYear, maxYear, keywords } = await getDatasetMetadata();

  return {
    title,
    description,
    metadataBase: new URL(site),
    keywords,
    alternates: { canonical: `${site}/tennis-match-database` },
    openGraph: {
      title,
      description,
      url: `${site}/tennis-match-database`,
      type: 'website',
      // Preferred OG image
      images: [{ url: `${site}/og/site-preview.png` }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@TennisMyLife68',
      title,
      description,
      images: [`${site}/og/site-preview.png`],
    },
    // Icons and manifest are provided by the global app layout to avoid duplicates
  };
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { jsonLd } = await getDatasetMetadata();

  // This is a nested layout — do not render <html> or <body> here.
  return (
    <>
      {children}
      <JsonLdScript json={jsonLd} />
    </>
  );
}
