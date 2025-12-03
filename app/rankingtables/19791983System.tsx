import React from "react";

// Function to get style based on tournament star number
const getCategoryStyle = (category: number | string | null | undefined) => {
  let num: number;

  if (category === null || category === undefined) return {
    border: "",
    color: "#FFFFFF",
    text: "text-xl",
  };

  if (typeof category === "number") num = category;
  else num = Number(String(category).trim());

  if (Number.isNaN(num)) return {
    border: "",
    color: "#FFFFFF",
    text: "text-xl",
  };

  if (num >= 41) return { border: "border-l-4 border-l-yellow-400", color: "#fbbf24", text: "text-xl" };
  if (num >= 31) return { border: "border-l-4 border-l-purple-500", color: "#8B5CF6", text: "text-xl" };
  if (num >= 21) return { border: "border-l-4 border-l-blue-500", color: "#3B82F6", text: "text-xl" };
  if (num >= 16) return { border: "border-l-4 border-l-emerald-500", color: "#10B981", text: "text-xl" };
  if (num >= 11) return { border: "border-l-4 border-l-amber-500", color: "#F59E0B", text: "text-xl" };
  if (num >= 6)  return { border: "border-l-4 border-l-rose-500", color: "#F43F5E", text: "text-xl" };
  if (num >= 1)  return { border: "border-l-4 border-l-gray-500", color: "#6B7280", text: "text-xl" };

  return { border: "", color: "#FFFFFF", text: "text-xl" };
};

// Article introduction
const ArticleIntroduction = () => (
  <section className="p-4 mb-6 bg-gray-900 rounded border border-white/10 text-white text-sm leading-relaxed">
    <h2 className="text-xl font-bold mb-3 text-center">
     1979 - 1983 Overview
    </h2>
    <p>
      Until 1978, <strong>the tournament categories were few and distinguished only by prize money</strong>, 
      except for the Triple Crown, which was a world of its own. Starting in 1979, 
      <strong>the ranking system changed completely with the introduction of the concept of “stars.”</strong> 
      Essentially, every parameter of a tournament became important for determining its difficulty and thus the ATP points, 
      with each increase in quality corresponding to an additional star in its classification.
    </p>
    <p>
      The stars in 1979 were assigned according to the following criteria:  
      <br />- <strong>1 star for every $25,000 increase in prize money</strong>  
      <br />- <strong>0 bonus stars for draws of 32 players, 1 for 48, 2 for 64/96, and 3 for 128 (Slams only)</strong>  
      <br />- <strong>Bonus based on field strength (sum of rankings):</strong>  
      <br />Above 1550 → 0 stars; 850–1550 → 1 star; 450–850 → 2 stars; Below 450 → 3 stars  
      <br />- <strong>Tournaments with prize money below $50,000 could not earn more than 1.5 bonus stars</strong>
    </p>
    <p>
      It sounds simple, but it wasn’t at all, especially considering <strong>there was no Internet at the time</strong>, 
      and calculating something so little known was difficult. This is why Tommasi used to speak of the 
      <strong>“computer ranking”</strong>. Once the stars of a tournament were determined, 
      <strong>a table was associated with each tournament showing the corresponding ATP points.</strong> 
      It’s important to note that <strong>the minimum number of tournaments a player had to compete in to be included in the ranking was 12.</strong>
    </p>
    <p>
      As one can imagine, <strong>the number of categories was actually higher than the number of tournaments</strong>, 
      which is paradoxical. These were <strong>fictitious categories used only to classify a tournament</strong>, 
      unlike today where tournaments belong to fixed categories (e.g., 250). 
      This detail is <strong>fundamental in the GOAT Theory.</strong>
    </p>
    <p>
      Examples:  
      <br />- <strong>Roland Garros ($375,000, 128 draw, difficulty 251 → 21 stars)</strong> → 220 points to the winner  
      <br />- <strong>Wimbledon ($300,000, 128 draw, difficulty 241 → 18 stars)</strong>  
      <br />- <strong>Australian Open ($350,000, 64 draw, difficulty 1091 → 17 stars)</strong>
    </p>
    <p>
      As one can see, <strong>there were empty categories (16, 19–20 stars), only fictitious.</strong> 
      A player’s points were calculated based on the round in which they were eliminated, plus 
      <strong>bonus points for victories over particular players.</strong> 
      The total points were then <strong>divided by the number of tournaments played.</strong> 
      In other words, <strong>the ranking was not a “best of” system but a simple arithmetic average.</strong>
    </p>
  </section>
);


// Tournament categories legend
const TournamentCategories = () => (
  <section className="overflow-x-auto rounded border border-white/10 bg-gray-900 p-4 mb-6">
    <h2 className="text-center text-white text-xl font-bold mb-3">
      TOURNAMENT CATEGORIES
    </h2>
    <table className="min-w-full text-white border-collapse text-sm font-semibold">
      <tbody>
        <tr>
          <td className="border border-white/20 px-3 py-2 font-bold">PRIZE MONEY STARS</td>
          <td className="border border-white/20 px-3 py-2">
            1 star awarded for every increment of $25,000
          </td>
        </tr>
        <tr>
          <td className="border border-white/20 px-3 py-2 font-bold">DRAW SIZE STARS</td>
          <td className="border border-white/20 px-3 py-2">
            0 - 32 draw, 1 - 48 draw, 2 - 64/96 draw, 3 - 128 draw (Grand Slams only)
          </td>
        </tr>
        <tr>
          <td className="border border-white/20 px-3 py-2 font-bold">DRAW DIFFICULTY STARS</td>
          <td className="border border-white/20 px-3 py-2">
            0 - total rank over 1550,<br />
            1 - total rank 850–1550,<br />
            2 - total rank 450–850,<br />
            3 - total rank below 450
          </td>
        </tr>
        <tr>
          <td className="border border-white/20 px-3 py-2 font-bold">COMMENTS</td>
          <td className="border border-white/20 px-3 py-2">
            Tournaments with less than $50,000 prize money cannot earn more than 1.5 extra stars
          </td>
        </tr>
      </tbody>
    </table>
  </section>
);

// Average system table
export function AverageSystemMinimum12() {
  const headers = [
    "STARS", "MD", "W", "F", "SF", "QF", "R16", "R32", "R64", "R128", "Q",
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
                style={{ color: style.color }}
              >
                {headers.map((h) => {
                  const isType = h === "TYPE";
                  return (
                    <td
                      key={h}
                      className={`border border-white/10 font-bold text-center ${!isType ? bgClass : style.text}`}
                      style={
                        isType
                          ? { borderLeft: style.border, position: "sticky", left: 0, zIndex: 10 }
                          : {}
                      }
                    >
                      {row[h] ?? "-"}
                    </td>
                  );
                })}
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
      <ArticleIntroduction />
      <TournamentCategories />
      <AverageSystemMinimum12 />
    </>
  );
}
