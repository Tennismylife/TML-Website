import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-gray-800/95 backdrop-blur-md border-b border-gray-700 w-full">
      <div className="flex items-center w-full px-3 py-3">
        <div className="font-bold text-gray-100">🎾 Tennis</div>
        <nav className="ml-6 flex flex-wrap gap-4">
          <Link href="/" className="text-gray-100 hover:text-yellow-400 transition-colors">Home</Link>
          <Link href="/tournaments" className="text-gray-100 hover:text-yellow-400 transition-colors">Tournaments</Link>
          <Link href="/seasons" className="text-gray-100 hover:text-yellow-400 transition-colors">Seasons</Link>
          <Link href="/statistics" className="text-gray-100 hover:text-yellow-400 transition-colors">Statistics</Link>
          <Link href="/h2h" className="text-gray-100 hover:text-yellow-400 transition-colors">H2H</Link>
          <Link href="/player-vs-player" className="text-gray-100 hover:text-yellow-400 transition-colors">Player vs Player</Link>
          <Link href="/ranking" className="text-gray-100 hover:text-yellow-400 transition-colors">Ranking</Link>
          <Link href="/records" className="text-gray-100 hover:text-yellow-400 transition-colors">Records</Link>
        </nav>
      </div>
    </header>
  )
}
