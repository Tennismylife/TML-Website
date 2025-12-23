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
  // Store as strings to allow empty input (user can delete '0')
  const [years, setYears] = useState(String(Math.floor(value)));
  const [days, setDays] = useState(String(Math.round((value - Math.floor(value)) * 365)));

  // Aggiorna l'output ogni volta che cambia years o days
  useEffect(() => {
    const yNum = years === '' ? NaN : parseInt(years, 10);
    const dNum = days === '' ? NaN : parseInt(days, 10);
    if (!Number.isFinite(yNum) || !Number.isFinite(dNum)) {
      // propagate invalid state so parent can disable Apply
      onChange(NaN);
      return;
    }
    // clamp days to 0..364 just in case
    const dClamped = Math.min(364, Math.max(0, dNum));
    const ageDecimal = +(yNum + dClamped / 365).toFixed(3); // 3 decimali
    onChange(ageDecimal);
  }, [years, days, onChange]);

  // Sync se il parent cambia il value
  useEffect(() => {
    const y = Math.floor(value);
    const d = Math.round((value - y) * 365);
    setYears(String(y));
    setDays(String(d));
  }, [value]);

  return (
    <div className="flex gap-2 items-center">
      <input
        type="number"
        min={Math.floor(min)}
        max={Math.floor(max)}
        value={years}
        onChange={(e) => {
          // allow empty string and digits only
          const v = e.target.value;
          if (v === '') return setYears('');
          const cleaned = v.replace(/[^0-9]/g, '');
          setYears(cleaned);
        }}
        className="w-16 px-2 py-1 rounded border border-gray-600 bg-gray-800 text-gray-200"
      />
      <span className="text-gray-200">years</span>
      <input
        type="number"
        min={0}
        max={364}
        value={days}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '') return setDays('');
          const cleaned = v.replace(/[^0-9]/g, '');
          // clamp to valid range
          const n = parseInt(cleaned, 10);
          if (Number.isFinite(n)) setDays(String(Math.min(364, Math.max(0, n))));
        }}
        className="w-16 px-2 py-1 rounded border border-gray-600 bg-gray-800 text-gray-200"
      />
      <span className="text-gray-200">days</span>
    </div>
  );
}
