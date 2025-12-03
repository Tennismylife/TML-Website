// matchHelpers.ts
// Tutte le funzioni helper, tipo ParsedSet, parsing punteggi, filtri, ecc.

export type ParsedSet = {
  a: number;
  b: number;
  raw: string;
  tb: boolean;
  tb_points: number | null;
};

// ====================
// --- Parse helper ---
export function parseSets(score: string): ParsedSet[] {
  if (!score) return [];

  return score
    .trim()
    .split(/\s+/)
    .map(t => {
      const m = t.match(/^(\d+)-(\d+)(?:\((\d{1,2})\))?$/);
      if (!m) return null;

      const a = Number(m[1]);
      const b = Number(m[2]);
      const tbPoints = m[3] !== undefined ? Number(m[3]) : null;

      const isTiebreak = tbPoints !== null || ((a === 7 && b === 6) || (a === 6 && b === 7));

      return {
        a,
        b,
        raw: t,
        tb: isTiebreak,
        tb_points: tbPoints,
      } as ParsedSet;
    })
    .filter(Boolean) as ParsedSet[];
}

export function hasDecidingTB(score: string, bestOf?: number) {
  const setsParsed = parseSets(score);
  if (!setsParsed.length) return false;
  const bo = bestOf ?? (setsParsed.length >= 5 ? 5 : 3);
  const decidingIndex = bo === 5 ? 4 : 2;
  return setsParsed.length > decidingIndex && setsParsed[decidingIndex].tb;
}

// ====================
// --- Filter Helpers ---
export function filterByResult(m: any, isWinner: boolean, result?: string) {
  if (!result) return true;
  const s = m.score?.toUpperCase() ?? "";
  switch (result) {
    case "Win": return isWinner;
    case "Loss": return !isWinner;
    case "W by RET": return isWinner && s.includes("RET");
    case "L by RET": return !isWinner && s.includes("RET");
    case "W by W/O": return isWinner && s.includes("W/O");
    case "L by W/O": return !isWinner && s.includes("W/O");
    default: return true;
  }
}

export function filterByRank(myRank: number | null, oppRank: number | null, asRank?: string, vsRank?: string) {
  if (asRank && !checkRank(myRank, oppRank, asRank, true)) return false;
  if (vsRank && !checkRank(myRank, oppRank, vsRank, false)) return false;
  return true;
}

export function checkRank(myRank: number | null, oppRank: number | null, rankFilter: string, isPlayer: boolean) {
  if (myRank == null || oppRank == null) return false;
  switch (rankFilter) {
    case "Top1": return isPlayer ? myRank === 1 : oppRank === 1;
    case "Top5": return isPlayer ? myRank <= 5 : oppRank <= 5;
    case "Top10": return isPlayer ? myRank <= 10 : oppRank <= 10;
    case "Top20": return isPlayer ? myRank <= 20 : oppRank <= 20;
    case "Top50": return isPlayer ? myRank <= 50 : oppRank <= 50;
    case "Top100": return isPlayer ? myRank <= 100 : oppRank <= 100;
    case "11+": return isPlayer ? myRank >= 11 : oppRank >= 11;
    case "21+": return isPlayer ? myRank >= 21 : oppRank >= 21;
    case "51+": return isPlayer ? myRank >= 51 : oppRank >= 51;
    case "101+": return isPlayer ? myRank >= 101 : oppRank >= 101;
    case "Higher": return isPlayer ? myRank < oppRank : myRank > oppRank;
    case "Lower": return isPlayer ? myRank > oppRank : myRank < oppRank;
    default: return true;
  }
}

export function filterByAge(myAge: number, oppAge: number, vsAge?: string) {
  if (!vsAge) return true;
  switch (vsAge) {
    case "Younger": return oppAge < myAge;
    case "Older": return oppAge > myAge;
    case "Under18": return oppAge < 18;
    case "Under21": return oppAge < 21;
    case "Under23": return oppAge < 23;
    case "Over28": return oppAge > 28;
    case "Over30": return oppAge > 30;
    case "Over40": return oppAge > 40;
    default: return true;
  }
}

export function filterByHand(oppHand: string, vsHand: string) {
  return (vsHand === "Right" && oppHand === "R") || (vsHand === "Left" && oppHand === "L");
}

export function filterByEntry(mySeed: number | null, oppSeed: number | null, myEntry?: string, oppEntry?: string, asEntry?: string, vsEntry?: string) {
  const check = (entry: string | undefined, seed: number | null, filter?: string) => {
    if (!filter) return true;
    switch (filter) {
      case "Seeded": return typeof seed === "number";
      case "Unseeded": return typeof seed !== "number";
      case "Qualifier": return entry === "Q";
      case "WC": return entry === "WC";
      case "Lucky Loser": return entry === "LL";
      case "Protected Ranking": return entry === "PR";
      case "Special Exempt": return entry === "SE";
      default: return true;
    }
  };
  return check(myEntry, mySeed, asEntry) && check(oppEntry, oppSeed, vsEntry);
}

export function filterBySetScore(
  m: any,
  set?: string,
  firstSet?: string,
  scoreFilter?: string,
  isWinner?: boolean
): boolean {
  if (m.status === false) return false;

  const setsParsed = parseSets(m.score ?? "");
  const bestOf = m.best_of;

  if (set) {
    switch (set) {
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

  if (firstSet && setsParsed.length > 0) {
    const [s1, s2, s3] = setsParsed;
    const w = isWinner;
    const bestOf5 = setsParsed.length >= 3;
    switch (firstSet) {
      case "Won 1st Set": if (!((w && s1.a > s1.b) || (!w && s1.b > s1.a))) return false; break;
      case "Lost 1st Set": if (!((w && s1.a < s1.b) || (!w && s1.b < s1.a))) return false; break;
      case "Won Sets 1&2": if (!bestOf5 || !s2 || !((w && s1.a > s1.b && s2.a > s2.b) || (!w && s1.b > s1.a && s2.b > s2.a))) return false; break;
      case "Lost Sets 1&2": if (!bestOf5 || !s2 || !((w && s1.a < s1.b && s2.a < s2.b) || (!w && s1.b < s1.a && s2.b < s2.a))) return false; break;
      case "Split 1&2": if (!s2 || !((w && (s1.a > s1.b) !== (s2.a > s2.b)) || (!w && (s1.b > s1.a) !== (s2.b > s2.a)))) return false; break;
      case "Up 2-1 Sets": if (!bestOf5 || !s3 || !((w && s1.a + s2.a + s3.a > s1.b + s2.b + s3.b) || (!w && s1.b + s2.b + s3.b > s1.a + s2.a + s3.a))) return false; break;
      case "Down 1-2 Sets": if (!bestOf5 || !s3 || !((w && s1.a + s2.a + s3.a < s1.b + s2.b + s3.b) || (!w && s1.b + s2.b + s3.b < s1.a + s2.a + s3.a))) return false; break;
    }
  }

  if (scoreFilter) {
    const w = isWinner;
    switch (scoreFilter) {
      case "All tiebreaks": if (!setsParsed.some(s => s.tb)) return false; break;
      case "TB won": if (!setsParsed.some(s => s.tb && ((w && s.a > s.b) || (!w && s.b > s.a)))) return false; break;
      case "TB lost": if (!setsParsed.some(s => s.tb && ((w && s.a < s.b) || (!w && s.b < s.a)))) return false; break;
      case "Deciding TB": if (!hasDecidingTB(m.score ?? "", m.best_of)) return false; break;
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
}
