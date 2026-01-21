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
};

module.exports = nextConfig;