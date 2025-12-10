"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getFlagFromIOC } from "@/lib/utils";
import Link from "next/link";

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
}: {
  href: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  large?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={`Go to ${title}`}
      className={`group flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-800/70 p-4 hover:bg-gray-700/60 transition-all duration-300 backdrop-blur-md shadow-md
        ${large
          ? "col-span-full flex-col text-center p-6 hover:scale-105 w-full"
          : "w-full flex-col hover:scale-105"}
      `}
    >
      <span className={`text-yellow-400 group-hover:text-yellow-300 ${large ? "mb-3" : ""}`}>
        {children}
      </span>
      <span className={`flex flex-col ${large ? "items-center" : ""}`}>
        <span className={`font-semibold text-gray-100 ${large ? "text-xl" : ""}`}>
          {title}
        </span>
        {subtitle && (
          <span className={`text-xs text-gray-400 ${large ? "mt-1" : ""}`}>
            {subtitle}
          </span>
        )}
      </span>
    </Link>
  );
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

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
    { href: "/tournaments", title: "Tournaments", subtitle: "Calendar & Results", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8M12 17v4m7-14V5H5v2a5 5 0 0 0 5 5h4a5 5 0 0 0 5-5Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 7H4a3 3 0 0 0 3 3M19 7h1a3 3 0 0 1-3 3" />
      </svg>
    )},
    { href: "/seasons", title: "Seasons", subtitle: "Season Summaries", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 8h18M5 8h14v13H5z" />
      </svg>
    )},
    { href: "/statistics", title: "Statistics", subtitle: "Advanced Metrics", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15v3m5-8v8m5-12v12" />
      </svg>
    )},
    { href: "/h2h", title: "H2H", subtitle: "Head-to-Head", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h12m0 0-3-3m3 3-3 3M21 17H9m0 0 3 3m-3-3 3-3" />
      </svg>
    )},
    { href: "/player-vs-player", title: "Player vs Player", subtitle: "Player Comparison", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" />
      </svg>
    )},
    { href: "/recordsRanking", title: "Records Ranking", subtitle: "Top Records Rankings", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" />
      </svg>
    )},
    { href: "/rankingtables", title: "Ranking Tables", subtitle: "Ranking Tables", icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M6 7v11M18 7v11M6 18h12" />
      </svg>
    )},
  ];

  return (
    <main className="w-full">
      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center w-full">Tennis My Life</h1>

      {/* Featured Records Card - Full Width */}
      <div className="w-full mb-8">
        <Card href="/records" title="Records" subtitle="All-Time Achievements & Milestones" large>
          <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 3h8l-2 4H10L8 3z" />
            <circle cx="12" cy="15" r="4" />
          </svg>
        </Card>
      </div>

      {/* Grid - full width */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {navItems.map((item) => (
          <Card key={item.href} href={item.href} title={item.title} subtitle={item.subtitle}>
            {item.icon}
          </Card>
        ))}
      </div>

      {/* Search Player */}
      <div className="w-full mt-12 relative max-w-md mx-auto">
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
    </main>
  );
}
