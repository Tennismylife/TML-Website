'use client'

import React from 'react';

interface NthInputProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  className?: string;
}

export default function NthInput({ label = 'Nth', value, onChange, min = 1, className = '' }: NthInputProps) {
  return (
    <div className={`mb-4 flex gap-4 items-center ${className}`}>
      <label className="flex items-center gap-2 flex-1 text-gray-200">
        <span className="whitespace-nowrap">{label}</span>
        <input
          type="number"
          min={min}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => {
            // Allow clearing the input on mobile (empty string)
            if (e.currentTarget.value === '') {
              onChange(Number.NaN);
              return;
            }
            const v = Number(e.currentTarget.value);
            onChange(Number.isNaN(v) ? Number.NaN : v);
          }}
          className="ml-2 bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 w-20 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </label>
    </div>
  );
}