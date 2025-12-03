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

// Tabella punti
const AverageSystemTable = () => {
  const rows = [
    { type: "CAT-A", MD: 128, W: 120, F: 105, SF: 70, QF: 35, R16: 20, R32: 10, R64: 5, R128: 1, Q: 1 },
    { type: "CAT-B", MD: 64, W: 100, F: 75, SF: 50, QF: 25, R16: 12, R32: 6, R64: 1, R128: 0, Q: 1 },
    { type: "CAT-B", MD: 32, W: 100, F: 75, SF: 50, QF: 25, R16: 12, R32: 1, R64: 0, R128: 0, Q: 1 },
    { type: "CAT-C", MD: 64, W: 80, F: 60, SF: 40, QF: 20, R16: 10, R32: 5, R64: 1, R128: 0, Q: 1 },
    { type: "CAT-C", MD: 32, W: 80, F: 60, SF: 40, QF: 20, R16: 10, R32: 1, R64: 0, R128: 0, Q: 1 },
    { type: "CAT-D", MD: 64, W: 60, F: 45, SF: 30, QF: 15, R16: 8, R32: 4, R64: 1, R128: 0, Q: 1 },
    { type: "CAT-D", MD: 32, W: 60, F: 45, SF: 30, QF: 15, R16: 8, R32: 1, R64: 0, R128: 0, Q: 1 },
    { type: "CAT-D", MD: 16, W: 60, F: 45, SF: 30, QF: 15, R16: 1, R32: 0, R64: 0, R128: 0, Q: 1 },
    { type: "CAT-E", MD: 64, W: 40, F: 30, SF: 20, QF: 15, R16: 10, R32: 5, R64: 1, R128: 0, Q: 1 },
    { type: "CAT-E", MD: 32, W: 40, F: 30, SF: 20, QF: 10, R16: 5, R32: 1, R64: 0, R128: 0, Q: 1 },
    { type: "CAT-E", MD: 16, W: 40, F: 30, SF: 20, QF: 10, R16: 1, R32: 0, R64: 0, R128: 0, Q: 1 },
    { type: "CAT-F", MD: 64, W: 20, F: 15, SF: 10, QF: 7, R16: 5, R32: 3, R64: 1, R128: 0, Q: 1 },
    { type: "CAT-F", MD: 32, W: 20, F: 15, SF: 10, QF: 5, R16: 3, R32: 1, R64: 0, R128: 0, Q: 1 },
    { type: "CAT-F", MD: 16, W: 20, F: 15, SF: 10, QF: 5, R16: 1, R32: 0, R64: 0, R128: 0, Q: 1 },
  ];

  const headers = ["CATEGORY", "MD", "W", "F", "SF", "QF", "R16", "R32", "R64", "R128", "Q"];

  return (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            {headers.map((h) => (
              <th
                key={h}
                className="border border-white/30 px-4 py-2 text-lg text-gray-200 text-center font-bold"
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
                    className={`border border-white/10 px-4 py-2 font-bold text-center ${rowColor}`}
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

// Componente principale con testo introduttivo 1974
export default function ATPRanking1974() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-yellow-400 text-center">1974-1975 Overview</h1>

        <p>
          In 1974, the first ranking reform was introduced. Although it retained a structure similar to the previous system, it further flattened the point differentials between categories.
        </p>

        <p>
          The difference in points awarded between a Triple Crown tournament and one of the lower categories was only <strong>20 points</strong> (16.7%). However, as in the previous season, exceptions were few, and the category B tournaments that could aspire to the role of top events were limited and had much smaller draws compared to the Slams, which were still played <strong>best-of-5 sets</strong> with a <strong>128-player draw</strong>.
        </p>

        <p>
          It is immediately noticeable that the Triple Crown maintained a privileged position and featured tournaments with prize money equal to or exceeding <strong>$150,000</strong>. There were two other tournaments with similar prize money—<strong>Tucson</strong> and <strong>Las Vegas</strong>—both ATP special events not included in any particular circuit. The tournament that stood out the most was <strong>Philadelphia</strong>, which, with its <strong>$100,000 prize money</strong> and <strong>128-player draw</strong>, could be considered the true fourth Major, replacing the Australian Open. As in the previous year, the Australian Open, despite having a lower category, was always promoted due to its tradition.
        </p>

        <CategoryInfoTable />
        <AverageSystemTable />
      </div>
    </div>
  );
}
