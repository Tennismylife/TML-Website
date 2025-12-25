import type { Metadata } from 'next'
import './globals.css'
import { ReactNode } from 'react'
import Header from '../components/Header'
import GAListener from './analytics/GAListener' // importa il listener
import { Montserrat } from 'next/font/google'

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
})


const siteTitle = 'TML — Tennis Records Data History Rankings, Matches & GOAT'
const siteDescription = 'TML aggregates tennis matches, rankings, player profiles and records. Explore player statistics, head-to-heads and historical data. Find the GOAT'
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
  alternates: {
    canonical: siteUrl,
  },
}

import fs from 'fs'
import path from 'path'

export default function RootLayout({ children }: { children: ReactNode }) {
  // Dynamically find the main compiled CSS file and preload it to reduce render-blocking
  let mainCssHref: string | null = null
  try {
    const cssDir = path.join(process.cwd(), '.next', 'static', 'css')
    const files = fs.readdirSync(cssDir)
    const cssFile = files.find((f) => f.endsWith('.css'))
    if (cssFile) mainCssHref = `/_next/static/css/${cssFile}`
  } catch (err) {
    // ignore - on environments without .next folder this will fail silently
  }

  return (
    <html lang="it" className={montserrat.variable}>
      <head>
        {/* Favicon */}
        <link rel="icon" href="/favicon.png" />

        

        {/* Preconnects for third-party origins (do this early but sparingly) */}
        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.google-analytics.com" crossOrigin="anonymous" />

        {/* Preload hero image (mobile-focused small AVIF to speed LCP on mobile emulation) */}
        <link rel="preload" href="/UnderCostruction-480.avif" as="image" type="image/avif" />

        {/* Preload main CSS if available (reduces render-blocking) */}
        {mainCssHref ? (
          <>
            {/* Load stylesheet with media=print and promote to all asynchronously to avoid render-blocking. */}
            <link rel="stylesheet" href={mainCssHref} media="print" />
            <noscript>
              <link rel="stylesheet" href={mainCssHref} />
            </noscript>
            <script dangerouslySetInnerHTML={{ __html: `var __href=${JSON.stringify(mainCssHref)}; (function(){try{var href=__href; var existing=document.querySelector('link[rel="stylesheet"][href="'+href+'"]'); if(existing){existing.media='print';} else { var s=document.createElement('link'); s.rel='stylesheet'; s.href=href; s.media='print'; document.head.appendChild(s);} var promote=function(){ try{ var s2=document.querySelector('link[rel="stylesheet"][href="'+href+'"]'); if(s2) s2.media='all'; }catch(e){} }; if('requestIdleCallback' in window) requestIdleCallback(promote,{timeout:1000}); else setTimeout(promote,100);}catch(e){} })();` }} />
          </>
        ) : null}
      </head>
      <body className="min-h-screen bg-gray-900 text-gray-100">
        {/* Site JSON-LD (rendered server-side in root layout) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
              name: 'TML — Tennis Rankings, Matches & Records',
            }),
          }}
        />

        {/* GA Listener */}
        <GAListener />
        <Header />
        <main className="w-full px-0 py-6">
          {children}
        </main>

        <footer className="text-sm text-gray-400 py-6 text-center">
          © 2025 TennisMyLife - Tennis Data Records History
        </footer>
      </body>
    </html>
  )
}
