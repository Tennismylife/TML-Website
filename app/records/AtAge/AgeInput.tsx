// components/AgeInput.tsx
'use client'

import { useState, useEffect } from 'react';

interface AgeInputProps {
  value: number; // valore in anni con decimali (es. 25.411)
  onChange: (age: number) => void;
  min?: number;
  max?: number;
}

export default function AgeInput({ value, onChange, min = 15, max = 50 }: AgeInputProps) {
  const [years, setYears] = useState(Math.floor(value));
  const [days, setDays] = useState(Math.round((value - Math.floor(value)) * 365));

  // Aggiorna l'output ogni volta che cambia years o days
  useEffect(() => {
    const ageDecimal = +(years + days / 365).toFixed(3); // 3 decimali
    onChange(ageDecimal);
  }, [years, days, onChange]);

  // Sync se il parent cambia il value
  useEffect(() => {
    const y = Math.floor(value);
    const d = Math.round((value - y) * 365);
    setYears(y);
    setDays(d);
  }, [value]);

  return (
    <div className="flex gap-2 items-center">
      <input
        type="number"
        min={Math.floor(min)}
        max={Math.floor(max)}
        value={years}
        onChange={(e) => setYears(Number(e.target.value))}
        className="w-16 px-2 py-1 rounded border border-gray-600 bg-gray-800 text-gray-200"
      />
      <span className="text-gray-200">years</span>
      <input
        type="number"
        min={0}
        max={364}
        value={days}
        onChange={(e) => setDays(Number(e.target.value))}
        className="w-16 px-2 py-1 rounded border border-gray-600 bg-gray-800 text-gray-200"
      />
      <span className="text-gray-200">days</span>
    </div>
  );
}
