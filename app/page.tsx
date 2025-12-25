import Image from 'next/image'
import { getFlagFromIOC } from "@/lib/utils";
import Link from "next/link";
import LatestMatchesClient from '@/components/LatestMatchesClient'
import SearchPlayerLoaderClient from '@/components/SearchPlayerLoaderClient'

interface Player {
  id: string;
  atpname: string;
  ioc?: string;
}

import Card from '@/components/Card'

export const metadata = {
  title: 'Tennis My Life — Tennis Stats, Records & Match Database',
  description: "Explore tournament calendars, match results, player head-to-head records, rankings and advanced tennis metrics on Tennis My Life.",
  openGraph: {
    title: 'Tennis My Life — Tennis Stats, Records & Match Database',
    description: "Explore tournament calendars, match results, player head-to-head records, rankings and advanced tennis metrics on Tennis My Life.",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/og-home.avif`,
        width: 1200,
        height: 630,
        alt: 'Tennis My Life - tennis statistics and records'
      }
    ],
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000' }
} as const;

export default function HomePage() {
  // All interactive logic was moved to client components to keep this page a Server Component.
  // Client widgets are loaded lazily to reduce initial hydration and TBT

  const navItems = [
    { href: "/tournaments", title: "Tournaments", subtitle: "Calendar & Results", description: "Browse upcoming and past tournaments with full draws, schedules, surfaces, and final results. Filter by level (Grand Slam, ATP 1000/500/250) and view match-by-match details.", colorClass: "text-rose-400 group-hover:text-rose-300", accentColor: "#fb7185", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8M12 17v4m7-14V5H5v2a5 5 0 0 0 5 5h4a5 5 0 0 0 5-5Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 7H4a3 3 0 0 0 3 3M19 7h1a3 3 0 0 1-3 3" />
      </svg>
    )},
    { href: "/seasons", title: "Seasons", subtitle: "Season Summaries", description: "Explore season-by-season summaries with player form, title lists, key statistics, and notable streaks to understand performance trends over time.", colorClass: "text-emerald-400 group-hover:text-emerald-300", accentColor: "#34d399", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 8h18M5 8h14v13H5z" />
      </svg>
    )},
    { href: "/statistics", title: "Statistics", subtitle: "Advanced Metrics", description: "Dive into advanced metrics such as Elo, serve and return stats, break/conversion rates, and other analytics with sortable tables and visualizations.", colorClass: "text-cyan-400 group-hover:text-cyan-300", accentColor: "#22d3ee", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15v3m5-8v8m5-12v12" />
      </svg>
    )},
    { href: "/h2h", title: "H2H", subtitle: "Head-to-Head", description: "Lookup head-to-head histories between two players with match results, dates, tournaments, and surface breakdowns to see how rivals match up.", colorClass: "text-indigo-400 group-hover:text-indigo-300", accentColor: "#818cf8", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h12m0 0-3-3m3 3-3 3M21 17H9m0 0 3 3m-3-3 3-3" />
      </svg>
    )},
    { href: "/player-vs-player", title: "Player vs Player", subtitle: "Player Comparison", description: "Compare two players side-by-side across multiple metrics: wins, surface records, ranking history, head-to-head, and recent form to spot strengths and weaknesses.", colorClass: "text-pink-400 group-hover:text-pink-300", accentColor: "#f472b6", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" />
      </svg>
    )},
    { href: "/recordsRanking", title: "Records Ranking", subtitle: "Top Records Rankings", description: "Discover who leads all-time categories — most titles, longest streaks, youngest/oldest milestones, and other record-based rankings across eras.", colorClass: "text-yellow-400 group-hover:text-yellow-300", accentColor: "#facc15", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" />
      </svg>
    )},
    { href: "/ranking", title: "Ranking", subtitle: "Current Rankings", description: "Explore current ATP rankings with date selector, point breakdowns, ranking movements, and quick filters to view weekly or seasonal snapshots.", colorClass: "text-lime-400 group-hover:text-lime-300", accentColor: "#a3e635", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M6 7v11M18 7v11M6 18h12" />
      </svg>
    )},
    { href: "/rankingtables", title: "Ranking Tables", subtitle: "Historical Systems", description: "Browse ranking tables for different historical systems (1973, 1974–75, 1976–78, etc.) and view leaderboards under each system.", colorClass: "text-amber-400 group-hover:text-amber-300", accentColor: "#f59e0b", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M6 7v11M18 7v11M6 18h12" />
      </svg>
    )},
    { href: "https://github.com/Tennismylife/TML-Database", title: "TML Database", subtitle: "Open-source Match DB", description: "Open-source tennis match database available for researchers and developers — clone, explore the schema, and download match data on GitHub.", colorClass: "text-slate-400 group-hover:text-slate-300", accentColor: "#94a3b8", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor" stroke="none">
        <path d="M12 .297c-6.6 0-12 5.4-12 12 0 5.3 3.4 9.8 8.2 11.4.6.1.8-.3.8-.6v-2c-3.3.7-4-1.4-4-1.4-.6-1.5-1.4-1.9-1.4-1.9-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.4 3.6 1 .1-.8.4-1.4.8-1.7-2.7-.3-5.6-1.4-5.6-6 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2.9-.3 1.8-.4 2.8-.4s1.9.1 2.8.4c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.8 1.2 3.1 0 4.6-2.9 5.7-5.6 6 .5.4.9 1.1.9 2.3v3.5c0 .3.2.7.8.6 4.8-1.6 8.2-6.2 8.2-11.4 0-6.6-5.4-12-12-12z" />
      </svg>
    )}, 
  ];

  const criticalCss = `
    /* Critical CSS: above-the-fold minimal styles for homepage */
    html,body{background:#0f1720;color:#e5e7eb}
    main{padding:0 1rem}
    @media(min-width:640px){main{padding:0 1.5rem}}

    /* Header / nav (above the fold) */
    header{background:transparent;border-bottom:none}
    header nav a{color:#fff}
    header nav a.text-yellow-400{color:#facc15}

    .hero-wrapper{width:100%;margin-bottom:2rem;display:flex;justify-content:center}
    .hero-img{width:100%;max-width:768px;height:auto;border-radius:.75rem;box-shadow:0 10px 15px rgba(2,6,23,.6);object-fit:cover}

    h1{font-weight:800;font-size:2rem;text-align:center;margin-bottom:1.25rem}
    @media(min-width:640px){h1{font-size:2.25rem}}

    /* Search input */
    .search-input{width:100%;background:#111827;color:#fff;border:1px solid #374151;border-radius:.375rem;padding:.5rem .75rem;outline:none}

    .card-cta{transition:transform .3s ease}
    `;

  // Small inline SVG placeholder (LQIP) painted immediately to speed up LCP
  const heroLQIP = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'><rect width='800' height='500' fill='%230f1720'/></svg>`;

  return (
    <main className="w-full px-4 sm:px-6">
      <style dangerouslySetInnerHTML={{ __html: criticalCss }} />
        {/* Under Construction Image (LQIP placeholder to speed LCP) */}
        <div
          className="w-full mb-8 flex justify-center hero-wrapper"
          style={{
            backgroundImage: `url("${heroLQIP}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            width: '100%'
          }}
        >
          {/* LCP image: use Next/Image with blur placeholder for LQIP and priority preload */}
        <Image
          src="/UnderCostruction.avif"
          alt="Under Construction"
          width={768}
          height={480}
          className="w-full max-w-lg h-auto rounded-xl shadow-lg object-cover"
          priority
          placeholder="blur"
          blurDataURL={heroLQIP}
          sizes="(max-width: 400px) 320px, (max-width: 640px) 480px, 768px"
        />
        </div>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center w-full">Tennis My Life</h1>
      <p className="text-left text-gray-300 mb-6 max-w-2xl mx-auto">
        Welcome to Tennis My Life — a comprehensive tennis statistics site. Explore tournament calendars, match results, player head-to-head records, season summaries, rankings, and advanced metrics to follow players' careers and compare performances.
      </p>

      {/* Page JSON-LD for homepage (WebPage) to help search engines) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            'url': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
            'name': 'Tennis My Life',
            'description': 'Comprehensive tennis statistics, match results, player profiles and historical rankings.'
          }),
        }}
      />

      {/* Search Player (client-loaded lazily to reduce initial hydration / TBT) */}
      <SearchPlayerLoaderClient />

      {/* Featured Records Card - Full Width */}
      <div className="w-full mb-8">
        <Card href="/records" title="Records" subtitle="All-Time Achievements & Milestones" large colorClass="text-yellow-400 group-hover:text-yellow-300" accentColor="#facc15">
          <svg viewBox="0 0 24 24" className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 3h8l-2 4H10L8 3z" />
            <circle cx="12" cy="15" r="4" />
          </svg>
        </Card>
      </div>

      {/* Latest Matches (moved to component) */}
      <LatestMatchesClient />

      {/* Grid - full width */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {navItems.map((item) => (
          <Card key={item.href} href={item.href} title={item.title} subtitle={item.subtitle} description={item.description} colorClass={item.colorClass} accentColor={item.accentColor}>
            {item.icon}
          </Card>
        ))}
      </div>


    </main>
  );
}
