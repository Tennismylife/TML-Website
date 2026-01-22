import path from 'path';
import fs from 'fs';

export default function Head() {
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://stats.tennismylife.org';
  const dataDir = path.join(process.cwd(), 'data');
  const distributions: Array<{ '@type': string; contentUrl: string; encodingFormat: string }> = [];

  try {
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir).filter(f => /\.csv$/i.test(f));
      files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      files.forEach(f => {
        distributions.push({
          '@type': 'DataDownload',
          contentUrl: `${site}/data/${encodeURIComponent(f)}`,
          encodingFormat: 'text/csv',
        });
      });
    }
  } catch (e) {
    console.error('Failed to read data dir for JSON-LD', e);
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Tennis Match Database (1968–2026) - TennisMyLife',
    url: `${site}/tennis-match-database`,
    distribution: distributions,
  };

  return (
    <>
      <title>Tennis Match Database (1968–2026) · TennisMyLife</title>
      <meta
        name="description"
        content="Download the complete Tennis Match Database from 1968 to 2026, including ATP stats and ongoing tournaments, in CSV format."
      />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </>
  );
}
