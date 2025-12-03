// app/players/[id]/Matches/FilteredMatches.tsx
import { Match } from "@/types";

export default function FilteredMatchesCalculation(
  matches: Match[],
  playerId: string,
  selectedYear: number | "All",
  tourneyFilter: string,
  surfaceFilter: string,
  roundFilter: string,
  resultFilter: string,
  vsRankFilter: string,
  vsAgeFilter: string,
  vsHandFilter: string,
  vsBackhandFilter: string,
  vsEntryFilter: string,
  asRankFilter: string,
  asEntryFilter: string,
  tourneyNameFilter: string,
  setFilter: string,
  firstSetFilter: string,
  scoreFilter: string,
  backhandMap: Map<string, string>
) {
  if (!matches) return [];

  // --- Helper functions ---
  function parseSets(score: string) {
    if (!score) return [];
    return score
      .trim()
      .split(/\s+/)
      .map((t) => {
        const m = t.match(/^(\d+)-(\d+)(\(\d{1,2}\))?$/);
        return m ? { a: Number(m[1]), b: Number(m[2]), raw: t, tb: !!m[3] } : null;
      })
      .filter(Boolean) as { a: number; b: number; raw: string; tb: boolean }[];
  }

  function hasDecidingTB(score: string, bestOf?: number) {
    const setsParsed = parseSets(score);
    if (!setsParsed.length) return false;
    const bo = bestOf ?? (setsParsed.length >= 5 ? 5 : 3);
    const decidingIndex = bo === 5 ? 4 : 2;
    return setsParsed.length > decidingIndex && setsParsed[decidingIndex].tb;
  }

  // --- Filtering ---
  return matches
    .filter((m) => {
      const isWinner = String(m.winner_id) === String(playerId);
      const myRank = isWinner ? m.winner_rank : m.loser_rank;
      const oppRank = isWinner ? m.loser_rank : m.winner_rank;
      const mySeed = isWinner ? m.winner_seed : m.loser_seed;
      const myEntry = isWinner ? m.winner_entry : m.loser_entry;
      const oppSeed = isWinner ? m.loser_seed : m.winner_seed;
      const oppEntry = isWinner ? m.loser_entry : m.winner_entry;
      const oppId = isWinner ? m.loser_id : m.winner_id;
      const oppAge = isWinner ? m.loser_age : m.winner_age;
      const oppHand = isWinner ? m.loser_hand : m.winner_hand;

      // --- Year ---
      if (selectedYear !== "All" && m.year !== selectedYear) return false;

      // --- Base filters ---
      if (tourneyNameFilter !== "All" && m.tourney_name !== tourneyNameFilter) return false;
      if (tourneyFilter !== "All" && m.tourney_level !== tourneyFilter) return false;
      if (surfaceFilter !== "All" && m.surface !== surfaceFilter) return false;
      if (roundFilter !== "All" && m.round !== roundFilter) return false;

      // --- Result filters ---
      if (resultFilter === "Win" && !isWinner) return false;
      if (resultFilter === "Loss" && isWinner) return false;
      if (resultFilter === "W by RET" && !(isWinner && m.score?.toUpperCase().includes("RET"))) return false;
      if (resultFilter === "L by RET" && !( !isWinner && m.score?.toUpperCase().includes("RET"))) return false;
      if (resultFilter === "W by W/O" && !(isWinner && m.score?.toUpperCase().includes("W/O"))) return false;
      if (resultFilter === "L by W/O" && !( !isWinner && m.score?.toUpperCase().includes("W/O"))) return false;

      // --- Vs Rank filter ---
      if (vsRankFilter !== "All") {
        switch (vsRankFilter) {
          case "Top1": if (oppRank !== 1) return false; break;
          case "Top5": if (!(oppRank >= 1 && oppRank <= 5)) return false; break;
          case "Top10": if (!(oppRank >= 1 && oppRank <= 10)) return false; break;
          case "Top20": if (!(oppRank >= 1 && oppRank <= 20)) return false; break;
          case "Top50": if (!(oppRank >= 1 && oppRank <= 50)) return false; break;
          case "Top100": if (!(oppRank >= 1 && oppRank <= 100)) return false; break;
          case "11+": if (!(oppRank >= 11)) return false; break;
          case "21+": if (!(oppRank >= 21)) return false; break;
          case "51+": if (!(oppRank >= 51)) return false; break;
          case "101+": if (!(oppRank >= 101)) return false; break;
          case "Higher": if (!(myRank != null && oppRank != null && myRank > oppRank)) return false; break;
          case "Lower": if (!(myRank != null && oppRank != null && myRank < oppRank)) return false; break;
        }
      }

      // --- Vs Age ---
      if (vsAgeFilter !== "All") {
        const myAge = isWinner ? m.winner_age : m.loser_age;
        switch (vsAgeFilter) {
          case "Younger": if (!(oppAge < myAge)) return false; break;
          case "Older": if (!(oppAge > myAge)) return false; break;
          case "Under18": if (!(oppAge < 18)) return false; break;
          case "Under21": if (!(oppAge < 21)) return false; break;
          case "Under23": if (!(oppAge < 23)) return false; break;
          case "Over28": if (!(oppAge > 28)) return false; break;
          case "Over30": if (!(oppAge > 30)) return false; break;
          case "Over40": if (!(oppAge > 40)) return false; break;
        }
      }

      // --- Hand filter ---
      if (vsHandFilter !== "All") {
        if (vsHandFilter === "Right" && oppHand !== "R") return false;
        if (vsHandFilter === "Left" && oppHand !== "L") return false;
      }

      // --- Entry filters ---
      if (vsEntryFilter !== "All") {
        switch (vsEntryFilter) {
          case "Seeded": if (typeof oppSeed !== "number") return false; break;
          case "Unseeded": if (typeof oppSeed === "number") return false; break;
          case "Qualifier": if (oppEntry !== "Q") return false; break;
          case "WC": if (oppEntry !== "WC") return false; break;
          case "Lucky Loser": if (oppEntry !== "LL") return false; break;
          case "Protected Ranking": if (oppEntry !== "PR") return false; break;
          case "Special Exempt": if (oppEntry !== "SE") return false; break;
        }
      }

      if (asRankFilter !== "All") {
        switch (asRankFilter) {
          case "Top1": if (myRank !== 1) return false; break;
          case "Top5": if (!(myRank != null && myRank <= 5)) return false; break;
          case "Top10": if (!(myRank != null && myRank <= 10)) return false; break;
          case "Top20": if (!(myRank != null && myRank <= 20)) return false; break;
          case "Top50": if (!(myRank != null && myRank <= 50)) return false; break;
          case "Top100": if (!(myRank != null && myRank <= 100)) return false; break;
          case "11+": if (!(myRank != null && myRank >= 11)) return false; break;
          case "21+": if (!(myRank != null && myRank >= 21)) return false; break;
          case "51+": if (!(myRank != null && myRank >= 51)) return false; break;
          case "101+": if (!(myRank != null && myRank >= 101)) return false; break;
          case "Higher": if (!(myRank != null && oppRank != null && myRank < oppRank)) return false; break;
          case "Lower": if (!(myRank != null && oppRank != null && myRank > oppRank)) return false; break;
        }
      }

      if (asEntryFilter !== "All") {
        switch (asEntryFilter) {
          case "Seeded": if (typeof mySeed !== "number") return false; break;
          case "Unseeded": if (typeof mySeed === "number") return false; break;
          case "Qualifier": if (myEntry !== "Q") return false; break;
          case "WC": if (myEntry !== "WC") return false; break;
          case "Lucky Loser": if (myEntry !== "LL") return false; break;
          case "Protected Ranking": if (myEntry !== "PR") return false; break;
          case "Special Exempt": if (myEntry !== "SE") return false; break;
        }
      }

      // --- Sets, first set, score ---
      const setsParsed = parseSets(m.score ?? "");

      // setFilter
      if (setFilter !== "All") {
        const bestOf = m.best_of;
        switch (setFilter) {
          case "Straights": if (setsParsed.length !== (bestOf === 5 ? 3 : 2)) return false; break;
          case "Deciders": if (setsParsed.length < (bestOf === 5 ? 5 : 3)) return false; break;
          case "All Best of 5": if (bestOf !== 5) return false; break;
          case "3 Sets (of 5)": if (!(bestOf === 5 && setsParsed.length === 3)) return false; break;
          case "4-Setters": if (!(bestOf === 5 && setsParsed.length === 4)) return false; break;
          case "5-Setters": if (!(bestOf === 5 && setsParsed.length === 5)) return false; break;
          case "All Best of 3": if (bestOf !== 3) return false; break;
          case "2-Setters": if (!(bestOf === 3 && setsParsed.length === 2)) return false; break;
          case "3 Sets (of 3)": if (!(bestOf === 3 && setsParsed.length === 3)) return false; break;
        }
      }

      // firstSetFilter

if (firstSetFilter !== "All") {
  
  if (!m.status || setsParsed.length === 0) return false;

  const [s1, s2, s3] = setsParsed;
  const w = isWinner;
  const bestOf5 = setsParsed.length >= 3;

  const wonSet = (set) => set.a > set.b;
  const lostSet = (set) => set.a < set.b;

  switch (firstSetFilter) {
    case "Won 1st Set":
      if (!(w ? wonSet(s1) : lostSet(s1))) return false;
      break;

    case "Lost 1st Set":
      if (!(w ? lostSet(s1) : wonSet(s1))) return false;
      break;

    case "Won Sets 1&2":
      if (!bestOf5 || !s2) return false;
      if (!(w ? (wonSet(s1) && wonSet(s2)) : (lostSet(s1) && lostSet(s2)))) return false;
      break;

    case "Lost Sets 1&2":
      if (!bestOf5 || !s2) return false;
      if (!(w ? (lostSet(s1) && lostSet(s2)) : (wonSet(s1) && wonSet(s2)))) return false;
      break;

    case "Split 1&2":
      if (!s2) return false;
      const split = (wonSet(s1) !== wonSet(s2)) && s1.a !== s1.b && s2.a !== s2.b;
      if (!split) return false;
      break;

    case "Up 2-1 Sets":
      if (!bestOf5 || !s3) return false;
      const setsWon = [s1, s2, s3].filter(wonSet).length;
      if (!(w ? setsWon === 2 : setsWon === 1)) return false;
      break;

    case "Down 1-2 Sets":
      if (!bestOf5 || !s3) return false;
      const setsLost = [s1, s2, s3].filter(lostSet).length;
      if (!(w ? setsLost === 2 : setsLost === 1)) return false;
      break;
  }
}


      // scoreFilter
      if (scoreFilter !== "All") {
        if (m.score?.includes("W/O")) return false;
        const w = isWinner;
        switch (scoreFilter) {
          case "All tiebreaks": if (!setsParsed.some(s => s.tb)) return false; break;
          case "TB won": if (!setsParsed.some(s => s.tb && ((w && s.a > s.b) || (!w && s.b > s.a)))) return false; break;
          case "TB lost": if (!setsParsed.some(s => s.tb && ((w && s.a < s.b) || (!w && s.b < s.a)))) return false; break;
          case "Deciding TB": if (!hasDecidingTB(m.score ?? "")) return false; break;
          case "All 7-5": if (!setsParsed.some(s => s.a + s.b === 12 && (s.a === 7 || s.b === 7))) return false; break;
          case "7-5 won": if (!setsParsed.some(s => ((w && s.a === 7 && s.b === 5) || (!w && s.b === 7 && s.a === 5)))) return false; break;
          case "7-5 lost": if (!setsParsed.some(s => ((w && s.a === 5 && s.b === 7) || (!w && s.b === 5 && s.a === 7)))) return false; break;
          case "All bagels": if (!setsParsed.some(s => (s.a === 6 && s.b === 0) || (s.a === 0 && s.b === 6))) return false; break;
          case "6-0 won": if (!setsParsed.some(s => ((w && s.a === 6 && s.b === 0) || (!w && s.b === 6 && s.a === 0)))) return false; break;
          case "6-0 lost": if (!setsParsed.some(s => ((w && s.a === 0 && s.b === 6) || (!w && s.b === 0 && s.a === 6)))) return false; break;
          case "All 6-1": if (!setsParsed.some(s => (s.a === 6 && s.b === 1) || (s.a === 1 && s.b === 6))) return false; break;
          case "6-1 won": if (!setsParsed.some(s => ((w && s.a === 6 && s.b === 1) || (!w && s.b === 6 && s.a === 1)))) return false; break;
          case "6-1 lost": if (!setsParsed.some(s => ((w && s.a === 1 && s.b === 6) || (!w && s.b === 1 && s.a === 6)))) return false; break;
        }
      }

      return true;
    })
    .sort((a, b) => new Date(b.tourney_date).getTime() - new Date(a.tourney_date).getTime());
}
