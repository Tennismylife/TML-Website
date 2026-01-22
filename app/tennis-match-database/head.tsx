import path from 'path';
import fs from 'fs';

export default function Head() {
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://stats.tennismylife.org';
  const dataDir = path.join(process.cwd(), 'data');
  const distributions: Array<{
    '@type': string;
    contentUrl: string;
    encodingFormat: string;
    name?: string;
    description: string;
    dateModified?: string;
    contentSize?: string;
  }> = [];

  try {
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir).filter(f => /\.csv$/i.test(f));
      files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      files.forEach(f => {
        const contentUrl = `${site}/data/${encodeURIComponent(f)}`;
        let dateModified: string | undefined;
        let contentSize: string | undefined;
        try {
          const fp = path.join(dataDir, f);
          if (fs.existsSync(fp)) {
            const st = fs.statSync(fp);
            dateModified = st.mtime.toISOString();
            contentSize = `${st.size} bytes`;
          }
        } catch (e) {
          // ignore per-file stat errors
        }

        distributions.push({
          '@type': 'DataDownload',
          contentUrl,
          encodingFormat: 'text/csv',
          name: f,
          description: `Complete match data for ${f.replace(/\.csv$/i, '')}`,
          ...(dateModified ? { dateModified } : {}),
          ...(contentSize ? { contentSize } : {}),
        });
      });
    }
  } catch (e) {
    console.error('Failed to read data dir for JSON-LD', e);
  }

  // Compute some additional dataset metadata for JSON-LD
  const years: number[] = [];
  let latestModified: string | null = null;
  try {
    distributions.forEach(d => {
      const m = d.contentUrl.match(/(\d{4})/g);
      if (m) {
        m.forEach(y => years.push(parseInt(y, 10)));
      }
      // try to extract mtime from the filesystem
      try {
        const filePath = path.join(process.cwd(), 'data', decodeURIComponent(d.contentUrl.replace(`${site}/data/`, '')));
        if (fs.existsSync(filePath)) {
          const st = fs.statSync(filePath);
          const iso = st.mtime.toISOString();
          if (!latestModified || iso > latestModified) latestModified = iso;
        }
      } catch (e) {
        // ignore per-file stat errors
      }
    });
  } catch (e) {
    // ignore
  }

  const minYear = years.length ? Math.min(...years) : 1968;
  const maxYear = years.length ? Math.max(...years) : 2026;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `Tennis Match Database (${minYear}–${maxYear}) - TennisMyLife`,
    url: `${site}/tennis-match-database`,
    // Creator for Dataset Search / attribution
    creator: {
      '@type': 'Organization',
      name: 'Tennis My Life',
      url: site,
    },
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
    dateModified: latestModified || undefined,
    distribution: distributions,
    keywords: ['tennis', 'matches', 'ATP', 'WTA', 'statistics', 'csv'],
  };

  return (
    <>
      <title>TennisMyLife – Complete Match Database &amp; Stats</title>
      <meta
        name="description"
        content="Download the complete Tennis Match Database from 1968 to 2026, including ATP stats and ongoing tournaments, in CSV format."
      />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </>
  );
}
