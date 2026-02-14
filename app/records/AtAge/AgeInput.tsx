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

  // Propagate immediately when user types (compute from the event value) so parent receives
  // the latest combined age synchronously — prevents "first Apply uses stale value" bugs.
  const propagate = (yVal?: string, dVal?: string) => {
    const y = yVal === undefined ? years : yVal;
    const d = dVal === undefined ? days : dVal;
    const yNum = y === '' ? NaN : parseInt(y, 10);
    const dNum = d === '' ? NaN : parseInt(d, 10);
    if (!Number.isFinite(yNum) || !Number.isFinite(dNum)) {
      onChange(NaN);
      return;
    }
    const dClamped = Math.min(364, Math.max(0, dNum));
    const ageDecimal = +(yNum + dClamped / 365).toFixed(3);
    onChange(ageDecimal);
  };

  // Aggiorna l'output ogni volta che cambia years o days (fallback / sync with external value)
  useEffect(() => {
    propagate();
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
        data-testid="age-years"
        type="number"
        min={Math.floor(min)}
        max={Math.floor(max)}
        value={years}
        onChange={(e) => {
          // allow empty string and digits only
          const v = e.target.value;
          if (v === '') {
            setYears('');
            propagate('', undefined);
            return;
          }
          const cleaned = v.replace(/[^0-9]/g, '');
          setYears(cleaned);
          propagate(cleaned, undefined);
        }}
        className="w-16 px-2 py-1 rounded border border-gray-600 bg-gray-800 text-gray-200"
      />
      <span className="text-gray-200">years</span>
      <input
        data-testid="age-days"
        type="number"
        min={0}
        max={364}
        value={days}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '') {
            setDays('');
            propagate(undefined, '');
            return;
          }
          const cleaned = v.replace(/[^0-9]/g, '');
          // clamp to valid range
          const n = parseInt(cleaned, 10);
          if (Number.isFinite(n)) {
            const clamped = String(Math.min(364, Math.max(0, n)));
            setDays(clamped);
            propagate(undefined, clamped);
          }
        }}
        className="w-16 px-2 py-1 rounded border border-gray-600 bg-gray-800 text-gray-200"
      />
      <span className="text-gray-200">days</span>
    </div>
  );
}
