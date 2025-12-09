// app/components/rankingUtils.ts

export type Row = {
  year: number;
  tournament: string;
  tourney_date: string | null;
  prize_money?: string | null;
  atp_category?: string | number | null;
  tourney_id?: string | number;
};

export type SortConfig = { key: keyof Row; direction: "asc" | "desc" } | null;

// --- Normalizza categorie: numero o stringa → F..AA ---
export const normalizeCategory = (val: string | number | null | undefined): string => {
  if (val == null) return "-";

  if (typeof val === "number") {
    if (val >= 41) return "AA";
    if (val >= 31) return "A";
    if (val >= 21) return "B";
    if (val >= 16) return "C";
    if (val >= 11) return "D";
    if (val >= 6) return "E";
    if (val >= 1) return "F";
    return "-";
  }

  const str = String(val).trim().toUpperCase();
  if (["AA","A","B","C","D","E","F"].includes(str)) return str;

  const num = parseFloat(str.replace(/[^0-9.-]+/g, ""));
  if (!isNaN(num)) return normalizeCategory(num);

  return "-";
};

// --- Styling categorie ---
const CATEGORY_STYLES: Record<string, any> = {
  AA: { border: "border-l-4 border-l-yellow-400", color: "#fbbf24", badge: "bg-yellow-300 text-gray-900", px: "px-5", py: "py-3", text: "text-xl" },
  A:  { border: "border-l-4 border-l-purple-500", color: "#8B5CF6", badge: "bg-purple-500 badge-text-black", px: "px-5", py: "py-3", text: "text-xl" },
  B:  { border: "border-l-4 border-l-blue-500", color: "#3B82F6", badge: "bg-blue-500 badge-text-black", px: "px-4", py: "py-2.5", text: "text-lg" },
  C:  { border: "border-l-4 border-l-emerald-500", color: "#10B981", badge: "bg-emerald-500 badge-text-black", px: "px-3.5", py: "py-2", text: "text-base" },
  D:  { border: "border-l-4 border-l-amber-500", color: "#F59E0B", badge: "bg-amber-500 badge-text-black", px: "px-3", py: "py-1.5", text: "text-sm" },
  E:  { border: "border-l-4 border-l-rose-500", color: "#F43F5E", badge: "bg-rose-500 badge-text-black", px: "px-2.5", py: "py-1", text: "text-xs" },
  F:  { border: "border-l-4 border-l-gray-500", color: "#6B7280", badge: "bg-gray-500 badge-text-black", px: "px-2", py: "py-0.5", text: "text-[0.65rem]" },
  "-": { border: "", color: "#FFFFFF", badge: "bg-gray-600 badge-text-black", px: "px-2", py: "py-1", text: "text-sm" },
};

export const getCategoryStyle = (category: string | number | null | undefined) => {
  const catStr = normalizeCategory(category);
  return CATEGORY_STYLES[catStr] || CATEGORY_STYLES["-"];
};

// --- Parsing prize money corretto ---
const parsePrize = (val: string | number | null | undefined): number => {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  // Rimuove simboli di valuta, spazi e separatori di migliaia
  const str = String(val).replace(/[$.\s]/g, "");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

// --- Sorting righe ---
export const sortRows = (rows: Row[], sortConfig: SortConfig) => {
  if (!sortConfig) return rows;
  const { key, direction } = sortConfig;

  const categoryOrder = ["F","E","D","C","B","A","AA"];

  return [...rows].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (key === "year") {
      return direction === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    }

    if (key === "prize_money") {
      const aNum = parsePrize(aVal);
      const bNum = parsePrize(bVal);
      return direction === "asc" ? aNum - bNum : bNum - aNum;
    }

    if (key === "tourney_date") {
      const aTime = aVal ? new Date(String(aVal)).getTime() : 0;
      const bTime = bVal ? new Date(String(bVal)).getTime() : 0;
      return direction === "asc" ? aTime - bTime : bTime - aTime;
    }

    if (key === "atp_category") {
      const parseNumeric = (val: string | number | null | undefined): number | null => {
        if (val == null) return null;
        if (typeof val === "number") return val;
        const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
        return isNaN(num) ? null : num;
      };

      const aNum = parseNumeric(aVal);
      const bNum = parseNumeric(bVal);

      if (aNum !== null && bNum !== null) return direction === "asc" ? aNum - bNum : bNum - aNum;

      const aCat = normalizeCategory(aVal);
      const bCat = normalizeCategory(bVal);
      const aIndex = categoryOrder.indexOf(aCat);
      const bIndex = categoryOrder.indexOf(bCat);

      return direction === "asc" ? aIndex - bIndex : bIndex - aIndex;
    }

    // Default string comparison
    return direction === "asc"
      ? String(aVal ?? "").localeCompare(String(bVal ?? ""))
      : String(bVal ?? "").localeCompare(String(aVal ?? ""));
  });
};
