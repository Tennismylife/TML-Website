import React from "react";

const CATEGORY_STYLES = {
  AA: { color: "text-yellow-400" },
  A: { color: "text-purple-400" },
  B: { color: "text-blue-400" },
  C: { color: "text-emerald-400" },
  D: { color: "text-amber-400" },
  E: { color: "text-rose-400" },
  F: { color: "text-gray-400" },
};

const getRowColor = (type) => {
  const cat = type.replace("CAT-", "").trim();
  return CATEGORY_STYLES[cat]?.color || "text-white";
};

const CategoryInfoTable = () => {
  const categories = [
    { cat: "AA", desc: "Category reserved for the Triple Crown events." },
    { cat: "A", desc: "Assigned to the most prestigious events of the regular series. Prize money over $150K." },
    { cat: "B", desc: "Assigned for tournaments paying out $125K." },
    { cat: "C", desc: "Assigned for tournaments paying out $100K." },
    { cat: "D", desc: "Assigned for tournaments paying out $75K." },
    { cat: "E", desc: "Assigned for tournaments paying $50K." },
    { cat: "F", desc: "Other countable tournaments with lower prize money." },
  ];

  return (
    <section className="overflow-x-auto rounded border border-white/10 bg-gray-900 p-4 mb-6">
      <h2 className="text-center text-white text-xl font-bold mb-3">TOURNAMENT CATEGORIES</h2>
      <table className="min-w-full text-white border-collapse">
        <tbody className="font-semibold text-sm">
          {categories.map(({ cat, desc }) => (
            <tr key={cat} className={CATEGORY_STYLES[cat].color}>
              <td className="border border-white/20 px-3 py-2 font-bold">{`CATEGORY ${cat}`}</td>
              <td className="border border-white/20 px-3 py-2">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

const TournamentPointsTable = () => {
  const rows = [
    { type: "CAT-AA", MD: 128, W: 140, F: 105, SF: 70, QF: 35, R16: 20, R32: 10, R64: 5, R128: 1, Q: 1 },
    { type: "CAT-AA", MD: 64, W: 140, F: 105, SF: 70, QF: 35, R16: 20, R32: 10, R64: 1, R128: "", Q: 1 },
    { type: "CAT-A", MD: 64, W: 120, F: 90, SF: 60, QF: 30, R16: 15, R32: 7, R64: 1, R128: "", Q: 1 },
    { type: "CAT-A", MD: 32, W: 120, F: 90, SF: 60, QF: 30, R16: 15, R32: 1, R64: "", R128: "", Q: 1 },
    { type: "CAT-B", MD: 64, W: 100, F: 75, SF: 50, QF: 25, R16: 12, R32: 6, R64: 1, R128: "", Q: 1 },
    { type: "CAT-B", MD: 32, W: 100, F: 75, SF: 50, QF: 25, R16: 12, R32: 1, R64: "", R128: "", Q: 1 },
    { type: "CAT-C", MD: 64, W: 80, F: 60, SF: 40, QF: 20, R16: 10, R32: 5, R64: 1, R128: "", Q: 1 },
    { type: "CAT-C", MD: 32, W: 80, F: 60, SF: 40, QF: 20, R16: 10, R32: 1, R64: "", R128: "", Q: 1 },
    { type: "CAT-D", MD: 64, W: 60, F: 45, SF: 30, QF: 15, R16: 8, R32: 4, R64: 1, R128: "", Q: 1 },
    { type: "CAT-D", MD: 32, W: 60, F: 45, SF: 30, QF: 15, R16: 8, R32: 1, R64: "", R128: "", Q: 1 },
    { type: "CAT-D", MD: 16, W: 60, F: 45, SF: 30, QF: 15, R16: 1, R32: "", R64: "", R128: "", Q: 1 },
    { type: "CAT-E", MD: 64, W: 40, F: 30, SF: 20, QF: 15, R16: 10, R32: 5, R64: 1, R128: "", Q: 1 },
    { type: "CAT-E", MD: 32, W: 40, F: 30, SF: 20, QF: 10, R16: 5, R32: 1, R64: "", R128: "", Q: 1 },
    { type: "CAT-E", MD: 16, W: 40, F: 30, SF: 20, QF: 10, R16: 1, R32: "", R64: "", R128: "", Q: 1 },
    { type: "CAT-F", MD: 64, W: 20, F: 15, SF: 10, QF: 7, R16: 5, R32: 3, R64: 1, R128: "", Q: 1 },
    { type: "CAT-F", MD: 32, W: 20, F: 15, SF: 10, QF: 5, R16: 3, R32: 1, R64: "", R128: "", Q: 1 },
    { type: "CAT-F", MD: 16, W: 20, F: 15, SF: 10, QF: 5, R16: 1, R32: "", R64: "", R128: "", Q: 1 },
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

// Componente principale con testo introduttivo 1976
export default function ATPRanking1976() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-yellow-400 text-center">1976-1978 Overview</h1>

        <p>
          In 1976, the third ranking reform was introduced, with few changes compared to the previous version, but once again flattening the point differentials between categories. This characteristic remained constant throughout the 1970s and 1980s. Only from 1990 onward, with the creation of the ATP Tour, did the differences between categories become more pronounced, with the Slams starting to carry significantly more weight than the lower-level tournaments.
        </p>

        <p>
          The point differential between Triple Crown tournaments in the new <strong>AA category</strong> was <strong>140</strong>, while the next lower level awarded <strong>120</strong>, meaning the differential was further flattened to <strong>14.28%</strong>. This helps to understand which tournaments were just below the Slams and could have some ambition to rise in importance.
        </p>

        <p>
          At first glance, it is immediately noticeable that there are far more tournaments compared to previous years. However, the Slams still held a privileged position: their prize money exceeded that of all others, with the <strong>Roland Garros</strong> at <strong>$177,000</strong>, <strong>Wimbledon</strong> at <strong>$160,000</strong>, and the <strong>US Open</strong> at an astounding <strong>$214,000</strong>—boosted by the higher revenues of the American Slam, which since 1975 had introduced evening sessions.
        </p>

        <p>
          The only anomaly in the system was the <strong>Palm Springs</strong> tournament, with <strong>$200,000</strong> in prize money despite a very small 64-player draw. Otherwise, a <strong>category B</strong> begins to emerge just below the Triple Crown, which would later give rise to the <strong>Super 9</strong> tournaments.
        </p>

        <CategoryInfoTable />
        <TournamentPointsTable />
      </div>
    </div>
  );
}
