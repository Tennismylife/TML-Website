import React from "react";

// Funzione per ottenere il colore basato sul numero
const getCategoryStyle = (category: string | number) => {
  const numStr = String(category).replace(/CAT-|\*|•/g, "").trim();
  const num = Number(numStr);

  if (Number.isNaN(num)) return { color: "#FFFFFF" };

  if (num >= 41) return { color: "#fbbf24" };
  if (num >= 31) return { color: "#8B5CF6" };
  if (num >= 21) return { color: "#3B82F6" };
  if (num >= 16) return { color: "#10B981" };
  if (num >= 11) return { color: "#F59E0B" };
  if (num >= 6)  return { color: "#F43F5E" };
  if (num >= 1)  return { color: "#6B7280" };

  return { color: "#FFFFFF" };
};

// Articolo storico tradotto in inglese
const HistoricalArticle = () => (
  <section className="overflow-x-auto rounded border border-white/10 bg-gray-900 p-4 mb-6">
    <h2 className="text-center text-white text-xl font-bold mb-3">
      1984 - 1989 Overview
    </h2>
    <p className="text-white text-sm mb-2">
      1984 was a fundamental year for the ATP ranking system. The “race to the stars” slowed down a bit, and much stricter rules for tournament categorization were introduced. The procedure remained the same as in previous years, but merit classes became more difficult to achieve. The algorithm used for tournaments was as follows:
    </p>
    <ul className="list-disc list-inside text-white text-sm mb-2">
      <li>Between $25,000 and $150,000: one merit star for every $25,000 increment in prize money</li>
      <li>Between $150,001 and $500,000: one merit star for every $50,000 increment</li>
      <li>Between $500,001 and $1,025,000: one merit star for every $75,000 increment</li>
      <li>Above $1,025,000: one merit star for every $100,000 increment</li>
    </ul>
    <p className="text-white text-sm mb-2">
      A bonus star was also included based on draw depth:
    </p>
    <ul className="list-disc list-inside text-white text-sm mb-2">
      <li>0 for a 32-player draw</li>
      <li>1 for a 48-player draw</li>
      <li>2 for a 56-player draw</li>
      <li>3 for a 64-player draw</li>
      <li>4 for a 96-player draw</li>
      <li>6 for a 128-player draw</li>
    </ul>
    <p className="text-white text-sm mb-2">
      There was no draw size bonus for tournaments with prize money below $15,000, and the same applied to 96- and 128-player draws with prize money under $200,000.
    </p>
    <p className="text-white text-sm mb-2">
      The 1984 system scheme is the same as 1983. Some may want to check the other article, but we report it here for those who are following only now.
    </p>
    <p className="text-white text-sm mb-2">
      From 1985 to 1989, fortunately, the ATP began publishing some information. These were not the tables that would have been so useful, but rather the points won by a player in a given tournament. The fundamental problem with this workaround was that points were “adjusted” by bonus points. To recover the actual points, one needed to know the key, i.e., what the bonus classes were. This particular aspect will not be the focus of this article, but it is essential to know. From that moment on, two approaches could be used: either research old newspapers and similar websites or use an inverse formula to deduce the points assigned for a victory in a given tournament. The approach currently used is the second—somewhat of a workaround, but it is the fastest method to get the information we need.
    </p>
  </section>
);

// Legenda categorie
const TournamentCategories = () => (
  <section className="overflow-x-auto rounded border border-white/10 bg-gray-900 p-4 mb-6">
    <h2 className="text-center text-white text-xl font-bold mb-3">
      TOURNAMENT CATEGORIES
    </h2>
    <table className="min-w-full border-collapse text-sm text-white">
      <tbody>
        <tr>
          <td className="border border-white/20 px-4 py-2 font-bold">PRIZE MONEY STARS</td>
          <td className="border border-white/20 px-4 py-2">
            <div>Between $25,000 and $150,000 one star of merit for each $25,000 prize pool increment</div>
            <div>Between $150,001 and $500,000 one star of merit for every $50,000 prize pool increase</div>
            <div>Between $500,001 and $1,025,000 one star of merit for each $75,000 prize pool increment</div>
            <div>From $1,025,000 and up one star of merit for every $100,000 prize pool increment</div>
          </td>
        </tr>
        <tr>
          <td className="border border-white/20 px-4 py-2 font-bold">DRAW SIZE STARS</td>
          <td className="border border-white/20 px-4 py-2">0 - 32 draw, 1 - 48 draw, 2 - 56 draw, 3 - 64 draw, 4 - 96 draw, 6 - 128 draw</td>
        </tr>
        <tr>
          <td className="border border-white/20 px-4 py-2 font-bold">DRAW DIFFICULTY STARS</td>
          <td className="border border-white/20 px-4 py-2">
            0 - total rank over 1550<br/>
            1 - total rank 850–1550<br/>
            2 - total rank 450–850<br/>
            3 - total rank below 450
          </td>
        </tr>
        <tr>
          <td className="border border-white/20 px-4 py-2 font-bold">COMMENTS</td>
          <td className="border border-white/20 px-4 py-2">There was no draw size bonus for tournaments with prize money under $15,000, and the same for 96- and 128-handed draw tournaments with prize money under $200,000</td>
        </tr>
      </tbody>
    </table>
  </section>
);

export function AverageSystemMinimum12() {
  const headers = [
    "STARS",
    "MD",
    "W",
    "F",
    "SF",
    "QF",
    "R16",
    "R32",
    "R64",
    "R128",
    "Q",
  ];

const rows = [
  { STARS: "40", MD: 128, W: 410, F: 308, SF: 205, QF: 103, R16: 52, R32: 26, R64: 13, R128: 1, Q: 1 },
  { STARS: "39", MD: 128, W: 400, F: 300, SF: 200, QF: 100, R16: 50, R32: 25, R64: 13, R128: 1, Q: 1 },
  { STARS: "38", MD: 128, W: 390, F: 293, SF: 195, QF: 98,  R16: 49, R32: 25, R64: 13, R128: 1, Q: 1 },
  { STARS: "37", MD: 128, W: 380, F: 285, SF: 190, QF: 95,  R16: 48, R32: 24, R64: 12, R128: 1, Q: 1 },
  { STARS: "36", MD: 128, W: 370, F: 278, SF: 185, QF: 93,  R16: 47, R32: 24, R64: 12, R128: 1, Q: 1 },
  { STARS: "35", MD: 128, W: 360, F: 270, SF: 180, QF: 90,  R16: 45, R32: 23, R64: 12, R128: 1, Q: 1 },
  { STARS: "34", MD: 128, W: 350, F: 263, SF: 175, QF: 88,  R16: 44, R32: 22, R64: 11, R128: 1, Q: 1 },
  { STARS: "33", MD: 128, W: 340, F: 255, SF: 170, QF: 85,  R16: 43, R32: 22, R64: 11, R128: 1, Q: 1 },
  { STARS: "32", MD: 128, W: 330, F: 248, SF: 165, QF: 83,  R16: 42, R32: 21, R64: 11, R128: 1, Q: 1 },
  { STARS: "31", MD: 128, W: 320, F: 240, SF: 160, QF: 80,  R16: 40, R32: 20, R64: 10, R128: 1, Q: 1 },
  { STARS: "30", MD: 128, W: 310, F: 233, SF: 155, QF: 78,  R16: 39, R32: 20, R64: 10, R128: 1, Q: 1 },
  { STARS: "29", MD: 128, W: 300, F: 225, SF: 150, QF: 75,  R16: 38, R32: 19, R64: 10, R128: 1, Q: 1 },
  { STARS: "28", MD: 128, W: 290, F: 218, SF: 145, QF: 73,  R16: 37, R32: 19, R64: 10, R128: 1, Q: 1 },
  { STARS: "27", MD: 128, W: 280, F: 210, SF: 140, QF: 70,  R16: 35, R32: 18, R64: 9,  R128: 1, Q: 1 },
  { STARS: "26", MD: 128, W: 270, F: 203, SF: 135, QF: 68,  R16: 34, R32: 17, R64: 9,  R128: 1, Q: 1 },
  { STARS: "25", MD: 128, W: 260, F: 195, SF: 130, QF: 65,  R16: 33, R32: 17, R64: 9,  R128: 1, Q: 1 },
  { STARS: "24", MD: 128, W: 250, F: 188, SF: 125, QF: 63,  R16: 32, R32: 16, R64: 8,  R128: 1, Q: 1 },
  { STARS: "23", MD: 128, W: 240, F: 180, SF: 120, QF: 60,  R16: 30, R32: 15, R64: 8,  R128: 1, Q: 1 },
  { STARS: "22", MD: 128, W: 230, F: 173, SF: 115, QF: 58,  R16: 29, R32: 15, R64: 8,  R128: 1, Q: 1 },
  { STARS: "21", MD: 128, W: 220, F: 165, SF: 110, QF: 55,  R16: 28, R32: 14, R64: 7,  R128: 1, Q: 1 },
  { STARS: "21", MD: 64,  W: 220, F: 165, SF: 110, QF: 55,  R16: 28, R32: 14, R64: 1,  R128: "", Q: 1 },
  { STARS: "20", MD: 128, W: 210, F: 158, SF: 105, QF: 53,  R16: 27, R32: 14, R64: 7,  R128: 1, Q: 1 },
  { STARS: "20", MD: 64,  W: 210, F: 158, SF: 105, QF: 53,  R16: 27, R32: 14, R64: 1,  R128: "", Q: 1 },
  { STARS: "19", MD: 64,  W: 200, F: 150, SF: 100, QF: 50,  R16: 25, R32: 13, R64: 1,  R128: "", Q: 1 },
  { STARS: "18", MD: 128, W: 190, F: 143, SF: 95,  QF: 48,  R16: 24, R32: 12, R64: 6,  R128: 1, Q: 1 },
  { STARS: "18", MD: 64,  W: 190, F: 143, SF: 95,  QF: 48,  R16: 24, R32: 12, R64: 1,  R128: "", Q: 1 },
  { STARS: "17", MD: 64,  W: 180, F: 135, SF: 90,  QF: 45,  R16: 23, R32: 12, R64: 1,  R128: "", Q: 1 },
  { STARS: "17", MD: 32,  W: 180, F: 135, SF: 90,  QF: 45,  R16: 23, R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "16", MD: 128, W: 170, F: 128, SF: 85,  QF: 43,  R16: 22, R32: 11, R64: 6,  R128: 1, Q: 1 },
  { STARS: "16", MD: 64,  W: 170, F: 128, SF: 85,  QF: 43,  R16: 22, R32: 11, R64: 1,  R128: "", Q: 1 },
  { STARS: "16", MD: 32,  W: 170, F: 128, SF: 85,  QF: 43,  R16: 22, R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "15", MD: 128, W: 160, F: 120, SF: 80,  QF: 40,  R16: 20, R32: 10, R64: 5,  R128: 1, Q: 1 },
  { STARS: "15", MD: 64,  W: 160, F: 120, SF: 80,  QF: 40,  R16: 20, R32: 10, R64: 1,  R128: "", Q: 1 },
  { STARS: "15", MD: 32,  W: 160, F: 120, SF: 80,  QF: 40,  R16: 20, R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "14", MD: 64,  W: 150, F: 113, SF: 75,  QF: 38,  R16: 19, R32: 9,  R64: 1,  R128: "", Q: 1 },
  { STARS: "14", MD: 32,  W: 150, F: 113, SF: 75,  QF: 38,  R16: 19, R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "13", MD: 128, W: 140, F: 105, SF: 70,  QF: 35,  R16: 18, R32: 9,  R64: 5,  R128: 1, Q: 1 },
  { STARS: "13", MD: 64,  W: 140, F: 105, SF: 70,  QF: 35,  R16: 18, R32: 9,  R64: 1,  R128: "", Q: 1 },
  { STARS: "13", MD: 32,  W: 140, F: 105, SF: 70,  QF: 35,  R16: 18, R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "12", MD: 64,  W: 130, F: 98,  SF: 65,  QF: 33,  R16: 17, R32: 9,  R64: 1,  R128: "", Q: 1 },
  { STARS: "12", MD: 32,  W: 130, F: 98,  SF: 65,  QF: 33,  R16: 17, R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "11", MD: 64,  W: 120, F: 90,  SF: 60,  QF: 30,  R16: 15, R32: 8,  R64: 1,  R128: "", Q: 1 },
  { STARS: "11", MD: 32,  W: 120, F: 90,  SF: 60,  QF: 30,  R16: 15, R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "10", MD: 64,  W: 110, F: 83,  SF: 55,  QF: 23,  R16: 14, R32: 7,  R64: 1,  R128: "", Q: 1 },
  { STARS: "10", MD: 32,  W: 110, F: 83,  SF: 55,  QF: 23,  R16: 14, R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "9",  MD: 64,  W: 100, F: 75,  SF: 50,  QF: 25,  R16: 13, R32: 7,  R64: 1,  R128: "", Q: 1 },
  { STARS: "9",  MD: 32,  W: 100, F: 75,  SF: 50,  QF: 25,  R16: 13, R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "8",  MD: 64,  W: 90,  F: 68,  SF: 45,  QF: 23,  R16: 12, R32: 6,  R64: 1,  R128: "", Q: 1 },
  { STARS: "8",  MD: 32,  W: 90,  F: 68,  SF: 45,  QF: 23,  R16: 12, R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "7",  MD: 64,  W: 80,  F: 60,  SF: 40,  QF: 20,  R16: 10, R32: 5,  R64: 1,  R128: "", Q: 1 },
  { STARS: "7",  MD: 32,  W: 80,  F: 60,  SF: 40,  QF: 20,  R16: 10, R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "6",  MD: 64,  W: 70,  F: 53,  SF: 35,  QF: 18,  R16: 9,  R32: 5,  R64: 1,  R128: "", Q: 1 },
  { STARS: "6",  MD: 32,  W: 70,  F: 53,  SF: 35,  QF: 18,  R16: 9,  R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "5",  MD: 64,  W: 60,  F: 45,  SF: 30,  QF: 15,  R16: 8,  R32: 4,  R64: 1,  R128: "", Q: 1 },
  { STARS: "5",  MD: 32,  W: 60,  F: 45,  SF: 30,  QF: 15,  R16: 8,  R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "4",  MD: 64,  W: 50,  F: 38,  SF: 25,  QF: 13,  R16: 7,  R32: 4,  R64: 1,  R128: "", Q: 1 },
  { STARS: "4",  MD: 32,  W: 50,  F: 38,  SF: 25,  QF: 13,  R16: 7,  R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "3.5",MD: 64,  W: 45,  F: 34,  SF: 23,  QF: 12,  R16: 6,  R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "3.5",MD: 32,  W: 45,  F: 34,  SF: 23,  QF: 12,  R16: 6,  R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "3",  MD: 64,  W: 40,  F: 30,  SF: 20,  QF: 10,  R16: 5,  R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "3",  MD: 32,  W: 40,  F: 30,  SF: 20,  QF: 10,  R16: 5,  R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "2.5",MD: 64,  W: 35,  F: 27,  SF: 18,  QF: 9,   R16: 5,  R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "2.5",MD: 32,  W: 35,  F: 27,  SF: 18,  QF: 9,   R16: 5,  R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "2",  MD: 64,  W: 30,  F: 23,  SF: 15,  QF: 8,   R16: 4,  R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "2",  MD: 32,  W: 30,  F: 23,  SF: 15,  QF: 8,   R16: 4,  R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "2",  MD: 16,  W: 30,  F: 23,  SF: 15,  QF: 8,   R16: 4,  R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "1.5",MD: 64,  W: 25,  F: 19,  SF: 13,  QF: 7,   R16: 4,  R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "1.5",MD: 32,  W: 25,  F: 19,  SF: 13,  QF: 7,   R16: 4,  R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "1.5",MD: 16,  W: 25,  F: 19,  SF: 13,  QF: 7,   R16: 4,  R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "1",  MD: 64,  W: 20,  F: 15,  SF: 10,  QF: 5,   R16: 3,  R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "1",  MD: 32,  W: 20,  F: 15,  SF: 10,  QF: 5,   R16: 3,  R32: 1,  R64: "", R128: "", Q: 1 },
  { STARS: "1",  MD: 16,  W: 20,  F: 15,  SF: 10,  QF: 5,   R16: 3,  R32: 1,  R64: "", R128: "", Q: 1 },
];

  return (
    <section className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow p-4">
      <h2 className="text-center text-white text-xl font-bold mb-3">
        AVERAGE SYSTEM WITH A MINIMUM OF 12 TOURNAMENTS
      </h2>

      <table className="min-w-full border-collapse text-sm text-white">
        <thead>
          <tr className="bg-black">
            {headers.map((h) => (
              <th
                key={h}
                className="border border-white/30 px-4 py-2 text-lg text-gray-200 font-bold text-center"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const bgClass = idx % 2 === 0 ? "bg-gray-800/20" : "bg-gray-700/20";
            const style = getCategoryStyle(row.STARS);

            return (
              <tr
                key={idx}
                className="hover:bg-gray-800 border-b border-white/10 transition-colors"
                style={{ color: style.color }} // Colore uniforme per tutta la riga
              >
                {headers.map((h) => (
                  <td
                    key={h}
                    className={`border border-white/10 font-bold text-center ${bgClass} text-base`}
                  >
                    {row[h] ?? "-"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

// Wrapper component
export default function TournamentCategoriesWrapper() {
  return (
    <>
      <HistoricalArticle />
      <TournamentCategories />
      <AverageSystemMinimum12 />
    </>
  );
}
