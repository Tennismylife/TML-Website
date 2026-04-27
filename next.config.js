/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // OBBLIGATORIO per node .next/standalone/server.js con PM2
  output: 'standalone',

  // Opzionale ma fortemente consigliato in produzione
  poweredByHeader: false,

  turbopack: {
    root: process.cwd(),
  },

  experimental: {
    disableOptimizedLoading: true,
  },

  // Se vuoi forzare la porta (utile se non usi variabile d'ambiente)
  // env: {
  //   PORT: '3000'
  // },

  async redirects() {
    return [
      // Old recordsranking tab URLs → new canonical SEO URLs (301 permanent)
      { source: '/recordsranking/count',                                    destination: '/recordsranking/weeksatno/1',                              permanent: true },
      { source: '/recordsranking/top',                                      destination: '/recordsranking/weeksattop/2',                             permanent: true },
      { source: '/recordsranking/streak/count',                             destination: '/recordsranking/streak/consecutiveweeksatno/1',            permanent: true },
      { source: '/recordsranking/endoftheseason/count',                     destination: '/recordsranking/endoftheseason/no/1',                      permanent: true },
      { source: '/recordsranking/ages/youngestcount',                       destination: '/recordsranking/ages/youngestsatno/1',                     permanent: true },
      { source: '/recordsranking/agesendoftheseason/youngestcount',         destination: '/recordsranking/agesendoftheseason/youngestsatno/1',       permanent: true },
      { source: '/recordsranking/timespan/count',                           destination: '/recordsranking/timespan/atno/1',                          permanent: true },
      { source: '/recordsranking/timespanendoftheseason/count',             destination: '/recordsranking/timespanendoftheseason/atno/1',            permanent: true },
      { source: '/recordsranking/mostpoints',                               destination: '/recordsranking/mostpoints/overall',                       permanent: true },
    ];
  },

  async rewrites() {
    return [
      { source: '/og/:slug.png', destination: '/og/:slug' },
    ];
  },
};

module.exports = nextConfig;