
'use client'

import React from 'react';

interface NthInputProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  className?: string;
  variant?: 'gray' | 'blue' | 'black';
}

export default function NthInput({
  label = 'Nth',
  value,
  onChange,
  min = 1,
  className = '',
  variant = 'gray',
}: NthInputProps) {
  const variantClasses = {
    gray: 'bg-gray-800 border-gray-700',
    blue: 'bg-blue-900 border-blue-700',
    black: 'bg-black border-gray-700',
  };

  return (
    <div className={`mb-4 flex gap-4 items-center ${className}`}>
      <label className="flex items-center gap-2 flex-1 text-gray-200">
        <span className="whitespace-nowrap">{label}</span>
        <input
          type="number"
          min={min}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(Number.isNaN(v) ? min : v);
          }}
          className={`ml-2 ${variantClasses[variant]} text-white rounded px-2 py-1 w-20 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
        />
      </label>
    </div>
  );
}
