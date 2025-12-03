import React from "react";

// Colori per categoria
const CATEGORY_STYLES = {
  AA: { color: "text-yellow-400" },
  A: { color: "text-purple-400" },
  B: { color: "text-blue-400" },
  C: { color: "text-emerald-400" },
  D: { color: "text-amber-400" },
  E: { color: "text-rose-400" },
  F: { color: "text-gray-400" },
};

// Funzione per ottenere il colore della riga
const getRowColor = (type) => {
  const cat = type.replace("CAT-", "").trim();
  return CATEGORY_STYLES[cat]?.color || "text-white";
};

// Legenda categorie
const CategoryInfoTable = () => {
  const categories = [
    { cat: "A", desc: "Category reserved for the Triple Crown events." },
    { cat: "B", desc: "Assigned to the most prestigious events of the regular series. Prize money over $100000." },
    { cat: "C", desc: "Assigned for tournaments paying more than $75000 but less than $100000." },
    { cat: "D", desc: "Assigned for tournaments paying $50000 with larger draws (64)." },
    { cat: "E", desc: "Assigned for tournaments paying $50000 with smaller draws (32)." },
    { cat: "F", desc: "Assigned to all other countable tournaments (≤ $25000) with 16/32/64 draw sizes." },
  ];

  return (
    <section className="overflow-x-auto rounded border border-white/10 bg-gray-900 p-4 mb-6">
      <h2 className="text-center text-white text-xl font-bold mb-3">TOURNAMENT CATEGORIES</h2>
      <table className="min-w-full text-white border-collapse">
        <tbody className="font-semibold text-sm">
          {categories.map(({ cat, desc }) => (
            <tr key={cat} className={CATEGORY_STYLES[cat].color}>
              <td className="border border-white/20 px-3 py-2">CATEGORY {cat}</td>
              <td className="border border-white/20 px-3 py-2">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

// Tabella principale
const AverageSystemTable = () => {
  const rows = [
    { type: "CAT-A", md: 128, W: 50, F: 32, SF: 20, QF: 12, R16: 5, R32: 3, R64: 1, R128: 0 },
    { type: "CAT-B", md: 128, W: 35, F: 24, SF: 15, QF: 9, R16: 4, R32: 1, R64: 0.5, R128: 0 },
    { type: "CAT-B", md: 64, W: 35, F: 24, SF: 15, QF: 9, R16: 4, R32: 1, R64: 0 },
    { type: "CAT-B", md: 32, W: 35, F: 24, SF: 15, QF: 9, R16: 4, R32: 0 },
    { type: "CAT-C", md: 64, W: 25, F: 16, SF: 10, QF: 6, R16: 3, R32: 1, R64: 0 },
    { type: "CAT-C", md: 32, W: 25, F: 16, SF: 10, QF: 6, R16: 3, R32: 0 },
    { type: "CAT-D", md: 64, W: 12, F: 8, SF: 5, QF: 3, R16: 1, R32: 0.5, R64: 0 },
    { type: "CAT-E", md: 32, W: 12, F: 8, SF: 5, QF: 3, R16: 1, R32: 0 },
    { type: "CAT-F", md: 64, W: 6, F: 4, SF: 2, QF: 1, R16: 0.5, R32: 0, R64: 0 },
    { type: "CAT-F", md: 32, W: 6, F: 4, SF: 2, QF: 1, R16: 0.5, R32: 0 },
    { type: "CAT-F", md: 16, W: 6, F: 4, SF: 2, QF: 1, R16: 0 },
  ];

  const headers = ["TYPE", "MD", "W", "F", "SF", "QF", "R16", "R32", "R64", "R128"];

  return (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            {headers.map((h) => (
              <th
                key={h}
                className="border border-white/30 px-4 py-2 text-lg text-gray-200 text-center align-middle"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const rowColor = getRowColor(row.type);
            return (
              <tr key={idx} className="hover:bg-gray-800 border-b border-white/10">
                {Object.values(row).map((val, i) => (
                  <td
                    key={i}
                    className={`border border-white/10 px-4 py-2 font-bold text-center align-middle ${rowColor}`}
                  >
                    {val ?? ""}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Componente principale con testo introduttivo
export default function ATPRanking1973() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-yellow-400 text-center">ATP Ranking 1973 Overview</h1>

        <p>
          The basic rule for a tournament to be eligible for the ATP ranking in 1973 was simple: <strong>a draw of at least 16 players</strong> and a <strong>minimum prize money of $20,000</strong>. This discovery opens new perspectives on evaluating tournaments from that era: the events awarding points were highly heterogeneous, including the Grand Prix, the WCT, the Riordan circuit (the “fake” one created by Connors), and the little-known European Spring Circuit on European clay.
        </p>

        <p>To make sense of this variety, it is useful to analyze the logic behind it:</p>

        <ul className="list-disc list-inside space-y-2">
          <li>There were <strong>six categories</strong>, unlike the three we have today, and the difference in points between them was less pronounced.</li>
          <li>Winning a top-category tournament (the Slams) awarded <strong>50 points</strong>.</li>
          <li>The next category awarded <strong>35 points</strong>, so the proportion compared to today was different: 50% lower than current points, 30% lower compared to 1973.</li>
          <li>Even between categories B and C, the difference was minimal, somewhat comparable to the 1000/500 difference today, but less marked.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-yellow-400 mt-6">Key points regarding classification</h2>
        <ul className="list-decimal list-inside space-y-2">
          <li><strong>Triple Crown (Slams, excluding the Australian Open):</strong> considered the top tournaments regardless of prize money, with draws of 128 players and best-of-5 set matches.</li>
          <li><strong>Exceptions like Las Vegas:</strong> despite a prize money higher than the Slams, the draw was 32 and matches were best-of-3 sets, placing it in a lower category.</li>
          <li><strong>Upgrading for tradition:</strong> some tournaments with low prize money were promoted to higher categories, such as the <strong>Australian Open</strong> (from F to D) or the <strong>Queen’s Club tournament</strong>, due to the Wimbledon boycott.</li>
          <li><strong>Early-round points:</strong> no points were awarded in the first rounds.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-yellow-400 mt-6">Conclusion</h2>
        <p>Slams always held a privileged position, regardless of draw size or prize money. Even with relatively low prize money, like the French Open, they were considered Triple Crown events. Conversely, tournaments like Las Vegas, despite their wealth, remained in lower categories, while historically important events like the Australian Open were promoted.</p>

        <CategoryInfoTable />
        <AverageSystemTable />
      </div>
    </div>
  );
}
