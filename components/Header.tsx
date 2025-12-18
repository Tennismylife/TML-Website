"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function Header() {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    clsx(
      "transition-colors",
      pathname === href
        ? "text-yellow-400 font-semibold"
        : "text-gray-100 hover:text-yellow-400"
    );

  return (
    <header className="bg-gray-800/95 border-b border-gray-700 w-full">
      <div className="flex items-center w-full px-4 py-3 gap-4">

        {/* LOGO */}
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Site logo"
            width={140}
            height={40}
            priority
            className="object-contain"
          />
        </Link>

        {/* NAV */}
        <nav className="flex flex-wrap gap-4">
          <Link href="/" className={linkClass("/")}>Home</Link>
          <Link href="/tournaments" className={linkClass("/tournaments")}>Tournaments</Link>
          <Link href="/seasons" className={linkClass("/seasons")}>Seasons</Link>
          <Link href="/statistics" className={linkClass("/statistics")}>Statistics</Link>
          <Link href="/h2h" className={linkClass("/h2h")}>H2H</Link>
          <Link href="/player-vs-player" className={linkClass("/player-vs-player")}>Player vs Player</Link>
          <Link href="/ranking" className={linkClass("/ranking")}>Ranking</Link>
          <Link href="/records" className={linkClass("/records")}>Records</Link>
        </nav>

      </div>
    </header>
  );
}
