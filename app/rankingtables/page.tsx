"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import RankingTablesLayout from "./RankingTablesLayout";
import System1973 from "./1973System";
import System19741975 from "./19741975System";
import System19761978 from "./19761978System";
import System19791983 from "./19791983System";
import System19841989 from "./19841989System";

import RankingTable from "./rankingTable";
import { Row, SortConfig } from "./rankingUtils";

const START_YEAR = 1973;

export default function RankingTablesPage() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState<number>(START_YEAR);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  // --- Read URL on mount ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const yearParam = params.get("year");
    let year = START_YEAR;

    if (yearParam && !isNaN(Number(yearParam))) year = Number(yearParam);
    else {
      const match = window.location.pathname.match(
        /^\/rankingtables\/(\d{4})$/
      );
      if (match && !isNaN(Number(match[1]))) year = Number(match[1]);
    }

    setSelectedYear(year);
  }, []);

  // --- Update URL when selectedYear changes ---
  useEffect(() => {
    router.replace(`?year=${selectedYear}`, { scroll: false });
  }, [selectedYear, router]);

  // --- Fetch ranking table ---
  useEffect(() => {
    let ignore = false;

    setLoading(true);
    setError(null);

    fetch(`/api/rankingtables?year=${selectedYear}`, { cache: "no-store" })
      .then((resp) => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.json();
      })
      .then((data) => {
        if (!ignore)
          setRows(Array.isArray(data) ? data : data.rows ?? []);
      })
      .catch((err) => {
        if (!ignore) {
          console.error(err);
          setError("Failed to load ranking table.");
          setRows([]);
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedYear]);

  // --- Sorting ---
  const requestSort = (key: keyof Row) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig?.key === key && sortConfig.direction === "asc")
      direction = "desc";
    setSortConfig({ key, direction });
  };

  return (
    <RankingTablesLayout
      selectedYear={selectedYear}
      onYearSelect={setSelectedYear}
    >
      {selectedYear === 1973 && <System1973 />}
      {(selectedYear === 1974 || selectedYear === 1975) && (
        <System19741975 />
      )}
      {selectedYear >= 1976 && selectedYear <= 1978 && <System19761978 />}
      {selectedYear >= 1979 && selectedYear <= 1983 && <System19791983 />}
      {selectedYear >= 1984 && selectedYear <= 1989 && <System19841989 />}

      <RankingTable
        rows={rows}
        sortConfig={sortConfig}
        requestSort={requestSort}
        loading={loading}
        error={error}
      />
    </RankingTablesLayout>
  );
}
