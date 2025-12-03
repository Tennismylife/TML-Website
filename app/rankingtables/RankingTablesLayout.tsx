import React from "react";

const START_YEAR = 1973;
const END_YEAR = 1989;

type Props = {
  children: React.ReactNode;
  selectedYear: number;
  onYearSelect: (year: number) => void;
};

export default function RankingTablesLayout({ children, selectedYear, onYearSelect }: Props) {
  const years = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 drop-shadow-lg">
          Ranking Tables
        </h1>
        <p className="mt-2 text-gray-400">Select a year to explore historical rankings</p>
      </header>

      {/* Years Grid */}
      <nav className="mb-10">
        <section className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4">
          {years.map((year) => (
            <button
              key={year}
              onClick={() => onYearSelect(year)}
              className={`relative group block rounded-xl border border-white/20 p-4 text-center shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:scale-105
                ${selectedYear === year ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-black" : "bg-gray-800/30 text-white"}`}
            >
              <div className="text-lg font-semibold">{year}</div>
              <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-indigo-500 pointer-events-none"></div>
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-25 blur-lg transition-opacity duration-300"></div>
            </button>
          ))}
        </section>
      </nav>

      {/* Page content */}
      <div className="bg-gray-900/50 rounded-xl p-6 shadow-inner">{children}</div>
    </main>
  );
}
