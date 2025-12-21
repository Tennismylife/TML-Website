"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getFlagFromIOC } from "@/lib/utils";
import Link from "next/link";
import LatestMatches from "@/components/LatestMatches";

interface Player {
  id: string;
  atpname: string;
  ioc?: string;
}

function Card({
  href,
  title,
  subtitle,
  children,
  large,
  description,
  colorClass,
  accentColor,
}: {
  href: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  large?: boolean;
  description?: string;
  colorClass?: string;
  accentColor?: string;
}) {
  // Extract base color (e.g. 'text-rose-400') if provided for use on the title
  const baseColorClass = colorClass ? colorClass.split(" ")[0] : "text-yellow-400";

  const iconRef = useRef<HTMLSpanElement | null>(null);
  const titleRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!accentColor) return;
    if (iconRef.current) iconRef.current.style.setProperty("color", accentColor, "important");
    if (titleRef.current) titleRef.current.style.setProperty("color", accentColor, "important");
  }, [accentColor]);

  const wrapperClass = `group flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-800/70 p-4 hover:bg-gray-700/60 transition-all duration-300 backdrop-blur-md shadow-md
    ${large
      ? "col-span-full flex-col text-center p-6 hover:scale-105 w-full"
      : "w-full flex-col hover:scale-105"}
  `;

  const content = (
    <>
      <span ref={iconRef} className={`${colorClass ?? "text-yellow-400 group-hover:text-yellow-300"} ${large ? "mb-3 text-4xl" : ""}`}>{children}</span>
      <span className={`flex flex-col items-center`}>
        <span ref={titleRef} className={`font-extrabold ${large ? "text-3xl sm:text-4xl" : "text-lg"} text-center ${baseColorClass}`}>
          {title}
        </span>
        {subtitle && (
          <span className={`${large ? "text-base mt-2 text-gray-300" : "text-xs text-gray-400 mt-1"} text-center`}>
            {subtitle}
          </span>
        )}
        {description && (
          <span className={`text-sm text-gray-300 ${large ? "mt-2 max-w-xl" : "mt-2"} text-center`}>
            {description}
          </span>
        )}
      </span>
    </>
  );

  const isExternal = href && href.toLowerCase().startsWith("http");

  return isExternal ? (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Go to ${title}`} className={wrapperClass}>
      {content}
    </a>
  ) : (
    <Link href={href} aria-label={`Go to ${title}`} className={wrapperClass}>
      {content}
    </Link>
  );
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch latest 10 matches once on mount
    setMatchesLoading(true);
    fetch('/api/matches/latest')
      .then((res) => res.json())
      .then((data) => {
        setRecentMatches(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error('Error fetching latest matches:', err))
      .finally(() => setMatchesLoading(false));
  }, []);

  // Debounced search
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        setSelectedIndex(-1);
        return;
      }

      setLoading(true);

      fetch(`/api/h2h/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data: Player[]) => {
          setResults(data);
          setSelectedIndex(-1);
        })
        .catch((err) => {
          if (err.name !== "AbortError") console.error("Search error:", err);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const handleSelect = (playerId: string) => {
    router.push(`/players/${playerId}`);
    setQuery("");
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = selectedIndex >= 0 ? results[selectedIndex] : results[0];
      if (target) handleSelect(target.id);
    } else if (e.key === "Escape") {
      setQuery("");
      setResults([]);
    }
  };

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

  return (
    <main className="w-full px-4 sm:px-6">
        {/* Under Construction Image */}
        <div className="w-full mb-8 flex justify-center">
          <img
            src="/UnderCostruction.png"
            alt="Under Construction"
            className="w-full max-w-lg h-auto rounded-xl shadow-lg object-cover"
          />
        </div>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center w-full">Tennis My Life</h1>
      <p className="text-left text-gray-300 mb-6 max-w-2xl mx-auto">
        Welcome to Tennis My Life — a comprehensive tennis statistics site. Explore tournament calendars, match results, player head-to-head records, season summaries, rankings, and advanced metrics to follow players' careers and compare performances.
      </p>

      {/* Search Player (full width, placed above Records) */}
      <div className="w-full mb-8">
        <div className="w-full">
          <div className="w-full relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search for a player..."
              aria-label="Search for an ATP player"
              autoComplete="off"
              className="w-full bg-gray-800 text-gray-100 placeholder-gray-400 border border-gray-700 rounded px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />

            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  inputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}

            {loading && (
              <ul className="border border-gray-700 mt-1 rounded max-h-60 overflow-y-auto bg-gray-800">
                {[...Array(4)].map((_, i) => (
                  <li key={i} className="px-3 py-2 animate-pulse">
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  </li>
                ))}
              </ul>
            )}

            {results.length > 0 && !loading && (
              <ul className="border border-gray-700 mt-1 rounded max-h-60 overflow-y-auto bg-gray-800 text-gray-100">
                {results.map((p, index) => (
                  <li
                    key={p.id}
                    data-idx={index}
                    onClick={() => handleSelect(p.id)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`px-3 py-2 cursor-pointer flex items-center gap-2 rounded transition-colors ${
                      index === selectedIndex
                        ? "bg-yellow-600 text-white"
                        : "hover:bg-gray-700"
                    }`}
                  >
                    {getFlagFromIOC(p.ioc)} {p.atpname}
                  </li>
                ))}
              </ul>
            )}

            {results.length === 0 && query && !loading && (
              <p className="text-sm text-gray-400 mt-1 text-center">No players found</p>
            )}
          </div>
        </div>
      </div>

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
      <LatestMatches />

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
