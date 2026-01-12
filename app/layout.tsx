import type { Metadata } from 'next'
import './globals.css'
import { ReactNode } from 'react'
import Header from '../components/Header'
import GAListener from './analytics/GAListener' // importa il listener
import TrackPageClient from './TrackPageClient' // client-side visit tracking (fires on route changes)
import MatomoClient from '../components/MatomoClient' // client-side Matomo tracker (migrated from pages/_app.tsx) 
import { Montserrat } from 'next/font/google'

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
  preload: true,
  fallback: ['system-ui', 'sans-serif']
})


const siteTitle = 'TML — Tennis Records Data History Rankings, Matches & GOAT'
const siteDescription = 'TML aggregates tennis matches, rankings, player profiles and records. Explore player statistics, head-to-heads and historical data. Find the GOAT'

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: '/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
  alternates: {
    canonical: '/',
  },
} 

export default function RootLayout({ children }: { children: ReactNode }) {

  return (
    <html lang="it" className={montserrat.variable}>
      <head>
        {/* Favicon: provide canonical root favicon.ico and handy fallbacks for other platforms */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#0f172a" />

        {/* Preconnects for third-party origins (do this early but sparingly) */}
        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.google-analytics.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* DNS prefetch for additional performance */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />

        {/* Preload small hero image (mobile-focused AVIF) to speed LCP on mobile */}
        <link rel="preload" href="/header-480.avif" as="image" type="image/avif" />
      </head>
      <body className="min-h-screen bg-gray-900 text-gray-100">
        {/* Site JSON-LD (rendered server-side in root layout) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              url: 'https://stats.tennismylife.org',
              name: 'TML — Tennis Rankings, Matches & Records',
            }),
          }}
        />

        {/* GA Listener */}
        <GAListener />
        {/* Client-side visit tracker: fires on initial load and route changes */}
        <TrackPageClient />
        {/* Matomo tracker (migrated from pages/_app.tsx) */}
        <MatomoClient />
        <Header />
        <main className="w-full px-0 py-6">
          {children}
        </main>

        <footer className="text-sm text-gray-400 py-6 text-center">
          © 2026 TennisMyLife - Tennis Data Records History
        </footer>
      </body>
    </html>
  )
}
