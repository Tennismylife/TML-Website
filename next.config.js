/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Abilita React Strict Mode
  experimental: {
    appDir: true, // Abilita la nuova app directory
  },
  distDir: '.next_build', // Cartella build personalizzata
};

module.exports = nextConfig;
