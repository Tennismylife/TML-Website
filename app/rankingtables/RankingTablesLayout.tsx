import React from "react";

const START_YEAR = 1973;
const END_YEAR = 1989;

type Props = {
  children: React.ReactNode;
  selectedYear: number;
  onYearSelect: (year: number) => void;
};

export default function RankingTablesLayout({ children, selectedYear, onYearSelect }: Props) {
  const years = React.useMemo(
    () => Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i),
    []
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      
      {/* Title Container */}
      <div className="mb-6 text-center bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 drop-shadow-lg">
          Ranking Tables
        </h1>
      </div>
      
      {/* Disclaimer Container */}
      <div className="mb-8 text-center bg-gray-900/70 rounded-lg p-4 border border-gray-600">
        <p className="text-gray-300 text-sm leading-relaxed">
          In 2018 I published on my GitHub all the ranking tables starting from 1973. Since then, no website has ever published these tables. For the first time, they are available all together, making it easier to understand how tournaments were classified in those years, without incorrect retrospective reconstructions
        </p>
      </div>

      {/* Years Grid */}
      <nav className="mb-10" role="navigation">
        <section className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4">
          {years.map((year) => (
            <button
              key={year}
              onClick={() => onYearSelect(year)}
              aria-pressed={selectedYear === year}
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
      <div className="bg-gray-900/50 rounded-xl p-6 shadow-inner">
        {children}
      </div>
    </main>
  );
}
