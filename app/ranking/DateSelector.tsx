"use client";

import { useEffect, useMemo, useState } from "react";

export interface DateItem {
  year: number;
  dates: Date[];
}

interface DateSelectorProps {
  data?: DateItem[];
  selectedDate?: Date;
  onSelectDate: (date: Date) => void;
}

export default function DateSelector({ data = [], selectedDate, onSelectDate }: DateSelectorProps) {
  const years = useMemo(() => data.map((d) => d.year), [data]);

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return selectedDate ? selectedDate.getFullYear() : years[0] ?? 0;
  });

  // Aggiorna selectedYear se selectedDate cambia
  useEffect(() => {
    if (selectedDate) {
      setSelectedYear(selectedDate.getFullYear());
    }
  }, [selectedDate]);

  // Dates disponibili per l'anno selezionato
  const datesForYear = useMemo(() => {
    const yearBlock = data.find((d) => d.year === selectedYear);
    // ordina decrescente per prendere ultima data
    return yearBlock?.dates.sort((a, b) => b.getTime() - a.getTime()) ?? [];
  }, [data, selectedYear]);

  // Se cambio anno, seleziono automaticamente l'ultima data disponibile
  useEffect(() => {
    if (datesForYear.length) {
      // se la data selezionata non è più nell'anno corrente, prendi l'ultima
      if (!selectedDate || selectedDate.getFullYear() !== selectedYear) {
        onSelectDate(datesForYear[0]);
      }
    }
  }, [selectedYear, datesForYear, selectedDate, onSelectDate]);

  if (!data.length) return <div className="p-4 text-center text-gray-400">Loading dates...</div>;

  return (
    <div className="flex gap-4 items-center">
      {/* Year dropdown */}
      <div className="flex flex-col">
        <label htmlFor="year-select" className="text-gray-200 font-semibold mb-1">Year:</label>
        <select
          id="year-select"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-600"
        >
          {years.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Date dropdown */}
      <div className="flex flex-col">
        <label htmlFor="date-select" className="text-gray-200 font-semibold mb-1">Date:</label>
        <select
          id="date-select"
          value={selectedDate?.toISOString().slice(0, 10) || ""}
          onChange={(e) => onSelectDate(new Date(e.target.value))}
          className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-600"
        >
          {datesForYear.map((date) => {
            const dateStr = date.toISOString().slice(0, 10);
            return <option key={dateStr} value={dateStr}>{dateStr}</option>;
          })}
        </select>
      </div>
    </div>
  );
}
