/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true, // opzionale, puoi lasciare se vuoi usare app directory
  },
  // Rimuovi distDir, così Next.js userà la cartella predefinita `.next`
  output: 'standalone', // utile per deploy su VPS
};

module.exports = nextConfig;
